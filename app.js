// © 2025 Bùi Đạt Hiếu - Bản quyền thuộc về tác giả. Mọi quyền được bảo lưu.
// Liên hệ: dathieu102@email.com

document.addEventListener("DOMContentLoaded", function() {
    const data = window.tuongTacData;
    const allDrugs = new Set();

    // Tạo danh sách tất cả hoạt chất và thuốc tương tác (hỗ trợ mảng hoặc chuỗi)
    data.forEach(item => {
        if (Array.isArray(item.hoat_chat)) {
            item.hoat_chat.forEach(hc => allDrugs.add(hc));
        } else {
            allDrugs.add(item.hoat_chat);
        }
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

    // Tìm tương tác giữa các cặp hoạt chất (hỗ trợ hoat_chat là mảng hoặc chuỗi)
    function findInteractions() {
        results.innerHTML = '';
        if (selectedDrugs.size < 2) return;

        const drugsArray = Array.from(selectedDrugs);
        const foundInteractions = [];

        drugsArray.forEach((drug1, i) => {
            drugsArray.slice(i + 1).forEach(drug2 => {
                data.forEach(item => {
                    // Kiểm tra hoat_chat có thể là mảng hoặc chuỗi
                    const isHoatChatMatch1 = Array.isArray(item.hoat_chat)
                        ? item.hoat_chat.includes(drug1)
                        : item.hoat_chat === drug1;
                    if (isHoatChatMatch1) {
                        item.tuong_tac.forEach(t => {
                            const isThuocMatch = Array.isArray(t.thuoc)
                                ? t.thuoc.includes(drug2)
                                : t.thuoc === drug2;
                            if (isThuocMatch) {
                                foundInteractions.push({
                                    hoatChat: drug1,
                                    interaction: { ...t, thuoc: drug2 }
                                });
                            }
                        });
                    }

                    // Kiểm tra chiều ngược lại
                    const isHoatChatMatch2 = Array.isArray(item.hoat_chat)
                        ? item.hoat_chat.includes(drug2)
                        : item.hoat_chat === drug2;
                    if (isHoatChatMatch2) {
                        item.tuong_tac.forEach(t => {
                            const isThuocMatch = Array.isArray(t.thuoc)
                                ? t.thuoc.includes(drug1)
                                : t.thuoc === drug1;
                            if (isThuocMatch) {
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

        // Hiển thị kết quả
        if (foundInteractions.length > 0) {
            foundInteractions.forEach(({ hoatChat, interaction }) => {
                results.appendChild(createResultCard(hoatChat, interaction));
            });
        } else {
            results.innerHTML = `<div class="result-card">Không tìm thấy tương tác nào giữa các hoạt chất đã chọn.</div>`;
        }
    }

    // Tạo thẻ kết quả
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
