// © 2025 Bùi Đạt Hiếu - Bản quyền thuộc về tác giả. Mọi quyền được bảo lưu.
// Liên hệ: dathieu102@email.com

document.addEventListener("DOMContentLoaded", function() {
    const data = window.tuongTacData;
    const allDrugs = new Set();

    // Tạo danh sách tất cả hoạt chất và thuốc tương tác (hỗ trợ mảng hoặc chuỗi)
    data.forEach(item => {
        // Thêm hoat_chat
        if (Array.isArray(item.hoat_chat)) {
            item.hoat_chat.forEach(hc => allDrugs.add(hc));
        } else {
            allDrugs.add(item.hoat_chat);
        }
        // Thêm cac_thuoc_trong_nhom
        if (item.cac_thuoc_trong_nhom) {
            if (Array.isArray(item.cac_thuoc_trong_nhom)) {
                item.cac_thuoc_trong_nhom.forEach(hc => allDrugs.add(hc));
            } else {
                allDrugs.add(item.cac_thuoc_trong_nhom);
            }
        }
        // Thêm các thuốc tương tác
        item.tuong_tac.forEach(t => {
            if (Array.isArray(t.thuoc)) {
                t.thuoc.forEach(th => allDrugs.add(th));
            } else {
                allDrugs.add(t.thuoc);
            }
        });
    });

    const input = document.getElementById('search-input');
    const suggestions = document.getElementById('suggestions');
    const results = document.getElementById('results');
    const selectedContainer = document.getElementById('selected-drugs');
    const selectedCount = document.getElementById('selected-count');
    const selectedDrugs = new Set();

    // Autocomplete & chọn hoạt chất
    input.addEventListener('input', debounce(function(e) {
        const query = e.target.value.trim().toLowerCase();
        suggestions.innerHTML = '';
        if (!query) {
            suggestions.style.display = 'none';
            return;
        }

        const filtered = Array.from(allDrugs).filter(d =>
            d.toLowerCase().includes(query) && !selectedDrugs.has(d)
        );

        if (filtered.length > 0) {
            filtered.forEach(drug => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.textContent = drug;
                div.onclick = () => {
                    if (!selectedDrugs.has(drug)) {
                        selectedDrugs.add(drug);
                        updateSelectedDrugs();
                        findInteractions();
                    }
                    input.value = '';
                    suggestions.style.display = 'none';
                };
                suggestions.appendChild(div);
            });
            suggestions.style.display = 'block';
        } else {
            suggestions.style.display = 'none';
        }
    }, 250));

    // Ẩn gợi ý khi click ngoài
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-container")) {
            suggestions.style.display = "none";
        }
    });

    // Xử lý Enter để thêm hoạt chất
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const value = input.value.trim();
            if (value && allDrugs.has(value) && !selectedDrugs.has(value)) {
                selectedDrugs.add(value);
                updateSelectedDrugs();
                findInteractions();
            }
            input.value = '';
            suggestions.style.display = 'none';
        }
    });

    // Hiển thị danh sách đã chọn
    function updateSelectedDrugs() {
        selectedContainer.innerHTML = '';
        let index = 1;
        selectedDrugs.forEach(drug => {
            const div = document.createElement('div');
            div.className = 'selected-item';
            div.innerHTML = `
                <div class="selected-item-number">${index++}</div>
                <div class="selected-item-content">${drug}</div>
                <button class="remove-btn" data-drug="${drug}" title="Xóa">&times;</button>
            `;
            div.querySelector('.remove-btn').addEventListener('click', () => {
                selectedDrugs.delete(drug);
                updateSelectedDrugs();
                findInteractions();
            });
            selectedContainer.appendChild(div);
        });

        selectedCount.textContent = selectedDrugs.size;

        if (selectedDrugs.size > 0) {
            const clearBtn = document.createElement('button');
            clearBtn.className = 'clear-all';
            clearBtn.textContent = 'Xóa tất cả';
            clearBtn.addEventListener('click', () => {
                selectedDrugs.clear();
                updateSelectedDrugs();
                results.innerHTML = '';
            });
            selectedContainer.appendChild(clearBtn);
        }
    }

    // Hàm xóa trùng lặp kết quả
    function removeDuplicates(interactions) {
        const seen = new Set();
        return interactions.filter(({ hoatChat, interaction }) => {
            const key = `${hoatChat}-${interaction.thuoc}-${interaction.muc_do}`;
            return seen.has(key) ? false : seen.add(key);
        });
    }

    // Tìm tương tác giữa các cặp hoạt chất (hỗ trợ hoat_chat là mảng/chuỗi và cac_thuoc_trong_nhom)
    function findInteractions() {
        results.innerHTML = '';
        if (selectedDrugs.size < 2) return;

        const drugsArray = Array.from(selectedDrugs);
        const foundInteractions = [];

        drugsArray.forEach((drug1, i) => {
            drugsArray.slice(i + 1).forEach(drug2 => {
                data.forEach(item => {
                    // Tạo mảng kết hợp hoat_chat và cac_thuoc_trong_nhom
                    const allRelatedDrugs = [
                        ...(Array.isArray(item.hoat_chat) ? item.hoat_chat : [item.hoat_chat]),
                        ...(item.cac_thuoc_trong_nhom || [])
                    ];

                    // Kiểm tra drug1 có trong nhóm
                    if (allRelatedDrugs.includes(drug1)) {
                        item.tuong_tac.forEach(t => {
                            const interactingDrugs = Array.isArray(t.thuoc) ? t.thuoc : [t.thuoc];
                            if (interactingDrugs.includes(drug2)) {
                                foundInteractions.push({
                                    hoatChat: drug1,
                                    interaction: { ...t, thuoc: drug2 },
                                    group: allRelatedDrugs
                                });
                            }
                        });
                    }

                    // Kiểm tra drug2 có trong nhóm
                    if (allRelatedDrugs.includes(drug2)) {
                        item.tuong_tac.forEach(t => {
                            const interactingDrugs = Array.isArray(t.thuoc) ? t.thuoc : [t.thuoc];
                            if (interactingDrugs.includes(drug1)) {
                                foundInteractions.push({
                                    hoatChat: drug2,
                                    interaction: { ...t, thuoc: drug1 },
                                    group: allRelatedDrugs
                                });
                            }
                        });
                    }
                });
            });
        });

        // Hiển thị kết quả với thông tin nhóm
        if (foundInteractions.length > 0) {
            const uniqueInteractions = removeDuplicates(foundInteractions);
            uniqueInteractions.forEach(({ hoatChat, interaction, group }) => {
                results.appendChild(createResultCard(hoatChat, interaction, group));
            });
        } else {
            results.innerHTML = `<div class="result-card">Không tìm thấy tương tác nào giữa các hoạt chất đã chọn.</div>`;
        }
    }

   function createResultCard(hoatChat, interaction, group) {
    const card = document.createElement('div');
    card.className = `result-card mucdo-${interaction.muc_do}`;
    
    // Lọc chỉ những thuốc trong nhóm đã được chọn
    const selectedGroup = [...new Set(group)].filter(d => selectedDrugs.has(d));
    // Nếu không có thuốc nào trong nhóm được chọn (trường hợp này không xảy ra vì hoatChat đã được chọn)
    // Nhưng để đảm bảo an toàn, nếu selectedGroup rỗng thì dùng hoatChat
    const mainDrug = selectedGroup.length > 0 ? selectedGroup.join(", ") : hoatChat;

    // Lọc danh sách nhóm để hiển thị "Thuộc nhóm" (không bao gồm mainDrug)
    const groupList = selectedGroup.filter(d => d !== hoatChat).join(", ");

    card.innerHTML = `
        <h3>${mainDrug} ↔ ${interaction.thuoc}</h3>
        <div class="severity mucdo-${interaction.muc_do}">
            Mức độ ${interaction.muc_do}: ${getSeverityText(interaction.muc_do)}
        </div>
        ${groupList ? `<div class="group-info">Thuộc nhóm: ${groupList}</div>` : ''}
        <p><strong>Phân tích:</strong> ${interaction.phan_tich}</p>
        <p><strong>Xử lý:</strong> ${interaction.xu_ly}</p>
    `;

    return card;
}


    function getSeverityText(mucdo) {
        const levels = {
            1: 'Theo dõi',
            2: 'Thận trọng',
            3: 'Cân nhắc',
            4: 'Nguy hiểm'
        };
        return levels[mucdo] || 'Không xác định';
    }

    // Hàm debounce
    function debounce(func, timeout = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), timeout);
        };
    }
});
