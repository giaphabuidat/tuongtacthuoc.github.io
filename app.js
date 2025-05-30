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

    // Hàm xóa trùng lặp nhóm thuốc (cải tiến)
    function removeDuplicates(interactions) {
        const seen = new Set();
        return interactions.filter(({ group, interaction }) => {
            // Lọc chỉ những thuốc trong nhóm đã được chọn
            const selectedGroup = [...new Set(group)].filter(d => selectedDrugs.has(d)).sort();
            if (selectedGroup.length === 0) return false;
            // Tạo key duy nhất dựa trên nhóm thuốc + thuốc tương tác + mức độ
            const key = `${selectedGroup.join(",")}-${interaction.thuoc}-${interaction.muc_do}`;
            return seen.has(key) ? false : seen.add(key);
        });
    }

    // Hàm tìm tương tác (tối ưu hiệu suất)
    function findInteractions() {
        results.innerHTML = '';
        if (selectedDrugs.size < 2) return;

        const drugsArray = Array.from(selectedDrugs);
        const foundInteractions = [];
        const processedPairs = new Set();

        drugsArray.forEach((drug1, i) => {
            drugsArray.slice(i + 1).forEach(drug2 => {
                // Tránh kiểm tra trùng lặp cặp thuốc
                const pairKey = [drug1, drug2].sort().join("-");
                if (processedPairs.has(pairKey)) return;
                processedPairs.add(pairKey);

                data.forEach(item => {
                    const allRelatedDrugs = [
                        ...(Array.isArray(item.hoat_chat) ? item.hoat_chat : [item.hoat_chat]),
                        ...(item.cac_thuoc_trong_nhom || [])
                    ];

                    // Kiểm tra tương tác hai chiều
                    [drug1, drug2].forEach(currentDrug => {
                        if (allRelatedDrugs.includes(currentDrug)) {
                            item.tuong_tac.forEach(t => {
                                const interactingDrugs = Array.isArray(t.thuoc) ? t.thuoc : [t.thuoc];
                                const targetDrug = currentDrug === drug1 ? drug2 : drug1;
                                
                                if (interactingDrugs.includes(targetDrug)) {
                                    foundInteractions.push({
                                        hoatChat: currentDrug,
                                        interaction: { ...t, thuoc: targetDrug },
                                        group: allRelatedDrugs
                                    });
                                }
                            });
                        }
                    });
                });
            });
        });

        const uniqueInteractions = removeDuplicates(foundInteractions);
        
        if (uniqueInteractions.length > 0) {
            uniqueInteractions.forEach(({ hoatChat, interaction, group }) => {
                results.appendChild(createResultCard(hoatChat, interaction, group));
            });
        } else {
            results.innerHTML = `<div class="result-card">Không tìm thấy tương tác nào giữa các hoạt chất đã chọn.</div>`;
        }
    }

    // Hàm tạo thẻ kết quả (chỉ hiển thị thuốc đã chọn)
    function createResultCard(hoatChat, interaction, group) {
        const card = document.createElement('div');
        card.className = `result-card mucdo-${interaction.muc_do}`;
        
        // Lọc các thuốc TRONG NHÓM đã được chọn
        const selectedInGroup = [...new Set(group)].filter(d => selectedDrugs.has(d));
        
        // Hiển thị tên thuốc/nhóm thuốc đã chọn
        const displayDrug = selectedInGroup.length > 1 ? 
            selectedInGroup.join(", ") : 
            hoatChat;

        card.innerHTML = `
            <h3>${displayDrug} ↔ ${interaction.thuoc}</h3>
            <div class="severity mucdo-${interaction.muc_do}">
                Mức độ ${interaction.muc_do}: ${getSeverityText(interaction.muc_do)}
            </div>
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
