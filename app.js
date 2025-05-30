// © 2025 Bùi Đạt Hiếu - Bản quyền thuộc về tác giả. Mọi quyền được bảo lưu.
// Liên hệ: dathieu102@email.com

document.addEventListener("DOMContentLoaded", function() {
    const data = window.tuongTacData;
    const allDrugs = new Set();

    // Tạo danh sách tất cả hoạt chất và thuốc tương tác (bao gồm cả cac_thuoc_trong_nhom)
    data.forEach(item => {
        // Thêm hoat_chat
        if (item.hoat_chat) {
            allDrugs.add(String(item.hoat_chat));
        }
        // Thêm cac_thuoc_trong_nhom
        if (item.cac_thuoc_trong_nhom) {
            const drugs = Array.isArray(item.cac_thuoc_trong_nhom) 
                ? item.cac_thuoc_trong_nhom 
                : [item.cac_thuoc_trong_nhom];
            drugs.forEach(d => d && allDrugs.add(String(d)));
        }
        // Thêm các thuốc tương tác
        item.tuong_tac.forEach(t => {
            if (t.thuoc) {
                if (Array.isArray(t.thuoc)) {
                    t.thuoc.forEach(th => {
                        if (th) {
                            allDrugs.add(String(th));
                        }
                    });
                } else {
                    allDrugs.add(String(t.thuoc));
                }
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

        // Chỉ lọc các thuốc là chuỗi, bỏ qua giá trị null/undefined
        const filtered = Array.from(allDrugs)
            .filter(d => typeof d === 'string')
            .filter(d => String(d).toLowerCase().includes(query) && !selectedDrugs.has(d));

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

    // Hàm xóa trùng lặp kết quả (chỉ kiểm tra cặp thuốc)
    function removeDuplicates(interactions) {
        const seen = new Set();
        return interactions.filter(({ hoatChat, interaction }) => {
            const drugs = [hoatChat, interaction.thuoc].sort();
            const key = `${drugs[0]}-${drugs[1]}`;
            return seen.has(key) ? false : seen.add(key);
        });
    }

    // Hàm tìm tương tác giữa các cặp hoạt chất (kiểm tra cả nhóm thuốc)
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

                // Kiểm tra tương tác từng cặp thuốc
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
                                    interaction: { ...t, thuoc: drug2 }
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
                                    interaction: { ...t, thuoc: drug1 }
                                });
                            }
                        });
                    }
                });
            });
        });

        // Loại bỏ trùng lặp trước khi hiển thị
        const uniqueInteractions = removeDuplicates(foundInteractions);

        if (uniqueInteractions.length > 0) {
            uniqueInteractions.forEach(({ hoatChat, interaction }) => {
                results.appendChild(createResultCard(hoatChat, interaction));
            });
        } else {
            results.innerHTML = `<div class="result-card">Không tìm thấy tương tác nào giữa các hoạt chất đã chọn.</div>`;
        }
    }

    // Hàm tạo thẻ kết quả
    function createResultCard(hoatChat, interaction) {
        const card = document.createElement('div');
        card.className = `result-card mucdo-${interaction.muc_do}`;
        card.innerHTML = `
            <h3>${hoatChat} ↔ ${interaction.thuoc}</h3>
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
