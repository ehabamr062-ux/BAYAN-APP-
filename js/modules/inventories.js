/* ---------- Dynamic Inventories Logic ---------- */
        let inventoriesConfig = JSON.parse(localStorage.getItem('acc_inventories_config')) || [
            {
                id: 'inv_egg', name: 'رصيد البيض', unit1: 'طبق', unit2: 'قطعة', icon: '🥚', color1: '#14532d', color2: '#15803d',
                borderColor: '#22c55e'
            }
        ];

        function saveInventoriesConfig() {
            localStorage.setItem('acc_inventories_config', JSON.stringify(inventoriesConfig));
            if (window.BayanDB && typeof window.BayanDB.setSetting === 'function') {
                window.BayanDB.setSetting('acc_inventories_config', inventoriesConfig);
            }
            renderInventoriesHeader();
            if (typeof renderInventoriesSettings === 'function') renderInventoriesSettings();
            else if (typeof window.renderInventoriesSettings === 'function') window.renderInventoriesSettings();
            if (window.saveToCloud) window.saveToCloud(); // Sync
        }

        window.openInventoriesSideMenu = function () {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal-box" style="max-width: 550px; width: 95%; background: linear-gradient(145deg, #0f172a, #1a2235); border: 2px solid var(--gold2); box-shadow: 0 25px 50px rgba(0,0,0,0.8), 0 0 20px rgba(212, 175, 55, 0.2); animation: modalScaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); padding: 0; overflow: hidden; border-radius: 24px;">
                    <div style="background: linear-gradient(90deg, #1e293b, #0f172a); padding: 20px 25px; border-bottom: 2px solid rgba(212, 175, 55, 0.3); display: flex; justify-content: space-between; align-items: center; position: relative;">
                         <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent); animation: shimmer 3s infinite;"></div>
                        <h3 style="margin: 0; color: var(--gold2); display: flex; align-items: center; gap: 12px; font-size: 22px; position: relative; z-index: 1;">
                            <span style="font-size: 26px;">📦</span> الأرصدة والمخزون
                        </h3>
                        <button class="btn ghost" style="color:#f87171; background: rgba(239, 68, 68, 0.1); border-radius: 50%; width: 40px; height: 40px; display:flex; align-items:center; justify-content:center; border: 1px solid rgba(239, 68, 68, 0.2); position: relative; z-index: 1;" onclick="this.closest('.modal-overlay').remove()">✕</button>
                    </div>
                    <div style="padding: 25px;">
                        <div id="dynamicInventoriesContainer" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px;">
                            <!-- Items injected via JS -->
                        </div>
                    </div>
                    <div style="background: rgba(0,0,0,0.3); padding: 15px 25px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
                        <p style="margin: 0; color: #94a3b8; font-size: 13px;">اضغط على أي رصيد لتعديله أو استعراض تفاصيله</p>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            renderInventoriesHeader();
            if (typeof beep === 'function') beep(1200, 0.02, 0.03);
        }

        function renderInventoriesHeader() {
            const container = document.getElementById('dynamicInventoriesContainer');
            if (!container) return;
            container.innerHTML = '';
            const date = dateInput ? dateInput.value : (new Date()).toISOString().slice(0, 10);

            // 1. Render Configured/Static Inventories (Legacy)
            inventoriesConfig.forEach(inv => {
                const stockKey = `acc_inv_stock_${inv.id}_${date}`;
                let stock = { u1: '0', u2: '0' };
                if (inv.id === 'inv_egg') {
                    const oldStockKey = `acc_egg_stock_${date}`;
                    if (localStorage.getItem(oldStockKey) && !localStorage.getItem(stockKey)) {
                        let oldEgg = JSON.parse(localStorage.getItem(oldStockKey));
                        stock = { u1: oldEgg.plates || '0', u2: oldEgg.pieces || '0' };
                        localStorage.setItem(stockKey, JSON.stringify(stock));
                    }
                }
                const raw = localStorage.getItem(stockKey);
                if (raw) {
                    try { stock = JSON.parse(raw); } catch (e) { }
                }

                const isEmpty = (stock.u1 == 0 && stock.u2 == 0);
                const textColor = isEmpty ? '#aaa' : '#fff';

                const html = `
                    <div class="electric-border-box" onclick="openInventoryModal('${inv.id}')" title="أضغط لتفاصيل ${inv.name}"
                        style="background: linear-gradient(var(--angle, 0deg), ${inv.borderColor}, #10b981, ${inv.borderColor}); width: 100%;">
                        <div class="electric-content" style="background: linear-gradient(145deg, ${inv.color1}, ${inv.color2}); min-width: 0;">
                            <span style="font-size: 11px; color: #bbf7d0; margin-bottom: 2px;">${inv.icon} ${inv.name}</span>
                            <div style="font-weight: bold; font-size: 14px; color: ${textColor}; white-space: nowrap;">
                                ${stock.u1} ${inv.unit1} | ${stock.u2} ${inv.unit2}
                            </div>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', html);
            });

            // 2. Render Dynamic Warehouse Products (New)
            const warehouse = JSON.parse(localStorage.getItem('acc_bayan_inventory') || '[]');
            warehouse.forEach((item, idx) => {
                const isEmpty = item.stock <= 0;
                const textColor = isEmpty ? '#f87171' : '#fff';
                const cardColor1 = isEmpty ? '#450a0a' : '#1e293b';
                const cardColor2 = isEmpty ? '#7f1d1d' : '#334155';
                const borderColor = item.stock < 5 ? '#ef4444' : '#60a5fa';

                const html = `
                    <div class="electric-border-box" onclick="editProduct(${idx})" title="تعديل ${item.name}"
                        style="background: linear-gradient(var(--angle, 0deg), ${borderColor}, #4f46e5, ${borderColor}); width: 100%;">
                        <div class="electric-content" style="background: linear-gradient(145deg, ${cardColor1}, ${cardColor2}); min-width: 0;">
                            <span style="font-size: 11px; color: #93c5fd; margin-bottom: 2px;">📦 ${item.name}</span>
                            <div style="font-weight: bold; font-size: 14px; color: ${textColor}; white-space: nowrap;">
                                ${item.stock} قطعة | ${formatNum(item.price)} ج
                            </div>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', html);
            });
        }

        function openInventoryModal(invId) {
            const inv = inventoriesConfig.find(i => i.id === invId);
            if (!inv) return;
            const date = dateInput ? dateInput.value : (new Date()).toISOString().slice(0, 10);
            const stockKey = `acc_inv_stock_${inv.id}_${date}`;
            let stock = { u1: '0', u2: '0' };
            const raw = localStorage.getItem(stockKey);
            if (raw) {
                try { stock = JSON.parse(raw); } catch (e) { }
            }

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
    <div class="modal-box" style="max-width: 400px; border: 1px solid ${inv.borderColor};">
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 40px; margin-bottom: 10px;">${inv.icon}</div>
            <h3 style="color: ${inv.borderColor};">تحديث ${inv.name}</h3>
            <p style="font-size: 12px; color: var(--muted);">تاريخ: ${date}</p>
        </div>

        <div style="display: grid; gap: 15px; margin-bottom: 20px;">
            <div>
                <label style="display: block; margin-bottom: 5px; color: #ddd;">رصيد (${inv.unit1})</label>
                <input type="number" id="modalStockU1" value="${stock.u1}" class="custom-input"
                    style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; width: 100%; border: 1px solid #444; color: #fff; font-size: 18px; text-align: center;">
            </div>
            <div>
                <label style="display: block; margin-bottom: 5px; color: #ddd;">رصيد (${inv.unit2})</label>
                <input type="number" id="modalStockU2" value="${stock.u2}" class="custom-input"
                    style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; width: 100%; border: 1px solid #444; color: #fff; font-size: 18px; text-align: center;">
            </div>
        </div>

        <div style="display: flex; gap: 10px;">
            <button class="btn green glowing" onclick="saveInventoryStockFromModal('${inv.id}')"
                style="flex: 1; padding: 12px;">حفظ الرصيد</button>
            <button class="btn red" onclick="this.closest('.modal-overlay').remove()"
                style="flex: 1; padding: 12px;">إلغاء</button>
        </div>
    </div>
    `;
            document.body.appendChild(overlay);
        }


        window.saveInventoryStockFromModal = function (invId) {
            const u1 = document.getElementById('modalStockU1').value || '0';
            const u2 = document.getElementById('modalStockU2').value || '0';
            const date = dateInput ? dateInput.value : (new Date()).toISOString().slice(0, 10);
            const stockKey = `acc_inv_stock_${invId}_${date}`;
            const stockData = { u1: u1, u2: u2 };
            localStorage.setItem(stockKey, JSON.stringify(stockData));
            if (window.BayanDB && typeof window.BayanDB.setInventoryStock === 'function') {
                window.BayanDB.setInventoryStock(invId, date, stockData);
            }
            renderInventoriesHeader();
            document.querySelector('.modal-overlay').remove();
            if (window.saveToCloud) window.saveToCloud();
        };