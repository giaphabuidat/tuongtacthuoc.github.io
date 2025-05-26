// © 2025 Bùi Đạt Hiếu - Bản quyền thuộc về tác giả. Mọi quyền được bảo lưu.
// Liên hệ: dathieu102@email.com

// Định nghĩa debounce ở phạm vi toàn cục
function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), timeout);
    };
}

document.addEventListener("DOMContentLoaded", function() {
    const data = window.tuongTacData;
    const allDrugs = new Set();
    const selectedDrugs = new Set();

    // Tạo danh sách tất cả hoạt chất và thuốc tương tác
    data.forEach(item => {
        allDrugs.add(item.hoat_chat);
        item.tuong_tac.forEach(t => allDrugs.add(t.thuoc));
    });

    const input = document.getElementById('search-input');
    const suggestions = document.getElementById('suggestions');
    const results = document.getElementById('results');
    const selectedContainer = document.getElementById('selected-drugs');
    const selectedCount = document.getElementById('selected-count');
    const circleContainer = document.getElementById('circle-visualization-container');

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

    // Hiển thị danh sách đã chọn (cột trái)
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

        // Nút xóa tất cả
        if (selectedDrugs.size > 0) {
            const clearBtn = document.createElement('button');
            clearBtn.className = 'clear-all';
            clearBtn.textContent = 'Xóa tất cả';
            clearBtn.addEventListener('click', () => {
                selectedDrugs.clear();
                updateSelectedDrugs();
                results.innerHTML = '';
                showCircleVisualization();
            });
            selectedContainer.appendChild(clearBtn);
        }

        showCircleVisualization();
    }

    // Tìm tương tác giữa tất cả các cặp hoạt chất đã chọn (cột phải)
    function findInteractions() {
        results.innerHTML = '';
        if (selectedDrugs.size < 2) return;

        const drugsArray = Array.from(selectedDrugs);
        const foundInteractions = [];

        // Duyệt tất cả các cặp (hai chiều)
        drugsArray.forEach((drug1, i) => {
            drugsArray.slice(i + 1).forEach(drug2 => {
                // Tìm tương tác drug1 -> drug2
                data.forEach(item => {
                    if (item.hoat_chat === drug1) {
                        item.tuong_tac.forEach(t => {
                            if (t.thuoc === drug2) {
                                foundInteractions.push({
                                    hoatChat: drug1,
                                    interaction: t
                                });
                            }
                        });
                    }
                    // Tìm tương tác drug2 -> drug1
                    if (item.hoat_chat === drug2) {
                        item.tuong_tac.forEach(t => {
                            if (t.thuoc === drug1) {
                                foundInteractions.push({
                                    hoatChat: drug2,
                                    interaction: t
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
        card.className = 'result-card mucdo-' + interaction.muc_do;

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

    // Hàm mức độ
    function getSeverityText(mucdo) {
        const levels = {
            1: 'Theo dõi',
            2: 'Thận trọng',
            3: 'Cân nhắc',
            4: 'Nguy hiểm'
        };
        return levels[mucdo] || 'Không xác định';
    }

    // Vẽ vòng tròn gợi ý các chất tương tác khi chỉ chọn 1 hoạt chất
    function showCircleVisualization() {
        circleContainer.innerHTML = '';
        if (selectedDrugs.size !== 1) {
            circleContainer.style.display = 'none';
            return;
        }
        circleContainer.style.display = 'block';

        const centerDrug = Array.from(selectedDrugs)[0];

        // Tìm các chất có tương tác với hoạt chất trung tâm
        let related = [];
        data.forEach(item => {
            if (item.hoat_chat === centerDrug) {
                related = related.concat(item.tuong_tac.map(t => ({
                    name: t.thuoc,
                    muc_do: t.muc_do
                })));
            }
        });
        data.forEach(item => {
            item.tuong_tac.forEach(t => {
                if (t.thuoc === centerDrug) {
                    related.push({
                        name: item.hoat_chat,
                        muc_do: t.muc_do
                    });
                }
            });
        });

        // Loại bỏ trùng lặp
        related = related.filter((v, i, arr) =>
            arr.findIndex(x => x.name === v.name) === i && v.name !== centerDrug
        );

        // Vẽ hoạt chất trung tâm
        const center = document.createElement('div');
        center.className = 'circle-center';
        center.innerHTML = centerDrug;
        circleContainer.appendChild(center);

        // Tính toán vị trí các node trên vòng tròn
        const R = Math.min(circleContainer.offsetWidth, circleContainer.offsetHeight) / 2 - 60;
        const cx = circleContainer.offsetWidth / 2;
        const cy = circleContainer.offsetHeight / 2;
        const n = related.length;

        related.forEach((rel, idx) => {
            const angle = (2 * Math.PI * idx) / n;
            const x = cx + R * Math.cos(angle) - 35;
            const y = cy + R * Math.sin(angle) - 35;

            // Vẽ đường nối
            const link = document.createElement('div');
            link.className = 'circle-link';
            const dx = x + 35 - cx;
            const dy = y + 35 - cy;
            const length = Math.sqrt(dx*dx + dy*dy);
            link.style.height = length + 'px';
            link.style.left = cx + 'px';
            link.style.top = cy + 'px';
            link.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
            link.style.background = rel.muc_do == 4 ? '#d32f2f' : rel.muc_do == 3 ? '#fbc02d' : rel.muc_do == 2 ? '#fb8c00' : '#1976d2';
            circleContainer.appendChild(link);

            // Vẽ node
            const node = document.createElement('div');
            node.className = 'circle-node mucdo-' + rel.muc_do;
            node.innerHTML = rel.name;
            node.style.left = x + 'px';
            node.style.top = y + 'px';
            node.title = `Mức độ: ${getSeverityText(rel.muc_do)}`;
            node.onclick = () => {
                if (!selectedDrugs.has(rel.name)) {
                    selectedDrugs.add(rel.name);
                    updateSelectedDrugs();
                    findInteractions();
                }
            };
            circleContainer.appendChild(node);
        });
    }

    // Khởi tạo lần đầu
    updateSelectedDrugs();
});
