// Replicates all operations in DataRepository.kt
const DataRepository = {
    farmers: [],
    shops: [],
    vehicles: [],
    purchases: [],
    sales: [],
    expenses: [],
    payments: [],
    staff: [],

    listeners: {},
    callbacks: {},

    init() {
        if (typeof db === 'undefined') {
            console.error("Firestore database is not initialized. Cannot start listeners.");
            return;
        }
        
        this.setupListener('farmers', 'farmers', 'name', 'asc');
        this.setupListener('shops', 'shops', 'name', 'asc');
        this.setupListener('vehicles', 'vehicles', 'number', 'asc');
        this.setupListener('purchases', 'purchases', 'date', 'desc');
        this.setupListener('sales', 'sales', 'date', 'desc');
        this.setupListener('expenses', 'expenses', 'date', 'desc');
        this.setupListener('paymentTransactions', 'payments', 'date', 'desc');
        this.setupListener('staff_users', 'staff', 'username', 'asc');
    },

    setupListener(collectionName, cacheKey, orderByField, direction) {
        this.listeners[collectionName] = db.collection(collectionName)
            .orderBy(orderByField, direction)
            .onSnapshot(snapshot => {
                const list = [];
                snapshot.forEach(doc => {
                    list.push({ id: doc.id, ...doc.data() });
                });
                this[cacheKey] = list;
                this.trigger(cacheKey, list);
            }, error => {
                console.error(`Listen failed for ${collectionName}:`, error);
            });
    },

    onChange(key, callback) {
        if (!this.callbacks[key]) this.callbacks[key] = [];
        this.callbacks[key].push(callback);
        
        // Trigger immediately if cache is already populated
        if (this[key] && this[key].length > 0) {
            callback(this[key]);
        }
    },

    trigger(key, data) {
        if (this.callbacks[key]) {
            this.callbacks[key].forEach(cb => {
                try { cb(data); } catch (e) { console.error("Error in listener callback:", e); }
            });
        }
    },

    // --- Farmers ---
    async addFarmer(farmer) {
        return db.collection("farmers").add(farmer);
    },

    async deleteFarmer(id) {
        return db.collection("farmers").doc(id).delete();
    },

    async updateFarmer(farmerId, name, phone, address, newOpeningBalance) {
        return db.runTransaction(async (transaction) => {
            const ref = db.collection("farmers").doc(farmerId);
            const doc = await transaction.get(ref);
            const currentBalance = doc.data().balance || 0.0;
            const oldOpeningBalance = doc.data().openingBalance || 0.0;
            const balanceDelta = newOpeningBalance - oldOpeningBalance;
            
            transaction.update(ref, {
                name: name,
                phone: phone,
                address: address,
                openingBalance: newOpeningBalance,
                balance: currentBalance + balanceDelta
            });
        });
    },

    // --- Shops ---
    async addShop(shop) {
        return db.collection("shops").add(shop);
    },

    async deleteShop(id) {
        return db.collection("shops").doc(id).delete();
    },

    async updateShop(shopId, name, phone, address, newOpeningBalance) {
        return db.runTransaction(async (transaction) => {
            const ref = db.collection("shops").doc(shopId);
            const doc = await transaction.get(ref);
            const currentBalance = doc.data().balance || 0.0;
            const oldOpeningBalance = doc.data().openingBalance || 0.0;
            const balanceDelta = newOpeningBalance - oldOpeningBalance;
            
            transaction.update(ref, {
                name: name,
                phone: phone,
                address: address,
                openingBalance: newOpeningBalance,
                balance: currentBalance + balanceDelta
            });
        });
    },

    // --- Vehicles ---
    async addVehicle(vehicle) {
        return db.collection("vehicles").add(vehicle);
    },

    async deleteVehicle(id) {
        return db.collection("vehicles").doc(id).delete();
    },

    async updateVehicle(vehicle) {
        return db.collection("vehicles").doc(vehicle.id).set(vehicle);
    },

    // --- Purchases ---
    async addPurchase(purchase) {
        const netWeight = purchase.totalWeight - purchase.emptyBoxWeight;
        const totalAmount = netWeight * purchase.rate;
        const finalPurchase = {
            ...purchase,
            netWeight: netWeight,
            totalAmount: totalAmount
        };

        return db.runTransaction(async (transaction) => {
            const farmerRef = db.collection("farmers").doc(purchase.farmerId);
            const farmerDoc = await transaction.get(farmerRef);
            const currentBalance = farmerDoc.data().balance || 0.0;

            const purchaseRef = db.collection("purchases").doc();
            transaction.set(purchaseRef, { ...finalPurchase, id: purchaseRef.id });

            const balanceChange = totalAmount - purchase.paidAmount;
            transaction.update(farmerRef, { balance: currentBalance + balanceChange });
        });
    },

    async deletePurchase(purchase) {
        return db.runTransaction(async (transaction) => {
            const farmerRef = db.collection("farmers").doc(purchase.farmerId);
            const farmerDoc = await transaction.get(farmerRef);
            const currentBalance = farmerDoc.data().balance || 0.0;

            const purchaseRef = db.collection("purchases").doc(purchase.id);
            transaction.delete(purchaseRef);

            const balanceChange = purchase.totalAmount - purchase.paidAmount;
            transaction.update(farmerRef, { balance: currentBalance - balanceChange });
        });
    },

    async updatePurchase(oldPurchase, newPurchase) {
        const netWeight = newPurchase.totalWeight - newPurchase.emptyBoxWeight;
        const totalAmount = netWeight * newPurchase.rate;
        const finalPurchase = {
            ...newPurchase,
            id: oldPurchase.id,
            netWeight: netWeight,
            totalAmount: totalAmount
        };

        return db.runTransaction(async (transaction) => {
            const oldFarmerRef = db.collection("farmers").doc(oldPurchase.farmerId);
            const oldFarmerDoc = await transaction.get(oldFarmerRef);
            const oldFarmerBalance = oldFarmerDoc.data().balance || 0.0;

            let newFarmerBalance = oldFarmerBalance;
            let newFarmerRef = oldFarmerRef;

            if (oldPurchase.farmerId !== newPurchase.farmerId) {
                newFarmerRef = db.collection("farmers").doc(newPurchase.farmerId);
                const newFarmerDoc = await transaction.get(newFarmerRef);
                newFarmerBalance = newFarmerDoc.data().balance || 0.0;
            }

            const purchaseRef = db.collection("purchases").doc(oldPurchase.id);
            transaction.set(purchaseRef, finalPurchase);

            const oldBalanceChange = oldPurchase.totalAmount - oldPurchase.paidAmount;
            const newBalanceChange = totalAmount - newPurchase.paidAmount;

            if (oldPurchase.farmerId === newPurchase.farmerId) {
                const finalBalance = oldFarmerBalance - oldBalanceChange + newBalanceChange;
                transaction.update(oldFarmerRef, { balance: finalBalance });
            } else {
                // Revert old farmer
                transaction.update(oldFarmerRef, { balance: oldFarmerBalance - oldBalanceChange });
                // Apply to new farmer
                transaction.update(newFarmerRef, { balance: newFarmerBalance + newBalanceChange });
            }
        });
    },

    getPurchasesForFarmer(farmerId) {
        return this.purchases.filter(p => p.farmerId === farmerId).sort((a,b) => b.date.localeCompare(a.date));
    },

    // --- Sales ---
    async addSale(sale) {
        const netWeight = sale.totalWeight - sale.emptyBoxWeight;
        const totalAmount = netWeight * sale.rate;
        const finalSale = {
            ...sale,
            netWeight: netWeight,
            totalAmount: totalAmount
        };

        return db.runTransaction(async (transaction) => {
            const shopRef = db.collection("shops").doc(sale.shopId);
            const shopDoc = await transaction.get(shopRef);
            const currentBalance = shopDoc.data().balance || 0.0;

            const saleRef = db.collection("sales").doc();
            transaction.set(saleRef, { ...finalSale, id: saleRef.id });

            const balanceChange = totalAmount - sale.paidAmount;
            transaction.update(shopRef, { balance: currentBalance + balanceChange });
        });
    },

    async deleteSale(sale) {
        return db.runTransaction(async (transaction) => {
            const shopRef = db.collection("shops").doc(sale.shopId);
            const shopDoc = await transaction.get(shopRef);
            const currentBalance = shopDoc.data().balance || 0.0;

            const saleRef = db.collection("sales").doc(sale.id);
            transaction.delete(saleRef);

            const balanceChange = sale.totalAmount - sale.paidAmount;
            transaction.update(shopRef, { balance: currentBalance - balanceChange });
        });
    },

    async updateSale(oldSale, newSale) {
        const netWeight = newSale.totalWeight - newSale.emptyBoxWeight;
        const totalAmount = netWeight * newSale.rate;
        const finalSale = {
            ...newSale,
            id: oldSale.id,
            netWeight: netWeight,
            totalAmount: totalAmount
        };

        return db.runTransaction(async (transaction) => {
            const oldShopRef = db.collection("shops").doc(oldSale.shopId);
            const oldShopDoc = await transaction.get(oldShopRef);
            const oldShopBalance = oldShopDoc.data().balance || 0.0;

            let newShopBalance = oldShopBalance;
            let newShopRef = oldShopRef;

            if (oldSale.shopId !== newSale.shopId) {
                newShopRef = db.collection("shops").doc(newSale.shopId);
                const newShopDoc = await transaction.get(newShopRef);
                newShopBalance = newShopDoc.data().balance || 0.0;
            }

            const saleRef = db.collection("sales").doc(oldSale.id);
            transaction.set(saleRef, finalSale);

            const oldBalanceChange = oldSale.totalAmount - oldSale.paidAmount;
            const newBalanceChange = totalAmount - newSale.paidAmount;

            if (oldSale.shopId === newSale.shopId) {
                const finalBalance = oldShopBalance - oldBalanceChange + newBalanceChange;
                transaction.update(oldShopRef, { balance: finalBalance });
            } else {
                // Revert old shop
                transaction.update(oldShopRef, { balance: oldShopBalance - oldBalanceChange });
                // Apply to new shop
                transaction.update(newShopRef, { balance: newShopBalance + newBalanceChange });
            }
        });
    },

    getSalesForShop(shopId) {
        return this.sales.filter(s => s.shopId === shopId).sort((a,b) => b.date.localeCompare(a.date));
    },

    // --- Expenses ---
    async addExpense(expense) {
        return db.collection("expenses").add(expense);
    },

    async deleteExpense(id) {
        return db.collection("expenses").doc(id).delete();
    },

    async updateExpense(expense) {
        return db.collection("expenses").doc(expense.id).set(expense);
    },

    // --- Payment Transactions ---
    async addPaymentTransaction(tx) {
        return db.runTransaction(async (transaction) => {
            const partyRef = tx.partyType === "Farmer" 
                ? db.collection("farmers").doc(tx.partyId)
                : db.collection("shops").doc(tx.partyId);
            
            const partyDoc = await transaction.get(partyRef);
            const currentBalance = partyDoc.data().balance || 0.0;

            const txRef = db.collection("paymentTransactions").doc();
            transaction.set(txRef, { ...tx, id: txRef.id });

            let balanceChange = 0.0;
            const totalEffect = (tx.amount || 0) + (tx.discount || 0);
            if (tx.partyType === "Farmer") {
                balanceChange = tx.type === "Pay" ? -totalEffect : totalEffect;
            } else if (tx.partyType === "Shop") {
                balanceChange = tx.type === "Receive" ? -totalEffect : totalEffect;
            }
            transaction.update(partyRef, { balance: currentBalance + balanceChange });
        });
    },

    async deletePaymentTransaction(tx) {
        return db.runTransaction(async (transaction) => {
            const partyRef = tx.partyType === "Farmer" 
                ? db.collection("farmers").doc(tx.partyId)
                : db.collection("shops").doc(tx.partyId);
            
            const partyDoc = await transaction.get(partyRef);
            const currentBalance = partyDoc.data().balance || 0.0;

            const txRef = db.collection("paymentTransactions").doc(tx.id);
            transaction.delete(txRef);

            let balanceChange = 0.0;
            const totalEffect = (tx.amount || 0) + (tx.discount || 0);
            if (tx.partyType === "Farmer") {
                balanceChange = tx.type === "Pay" ? -totalEffect : totalEffect;
            } else if (tx.partyType === "Shop") {
                balanceChange = tx.type === "Receive" ? -totalEffect : totalEffect;
            }
            transaction.update(partyRef, { balance: currentBalance - balanceChange });
        });
    },

    async updatePaymentTransaction(oldTx, newTx) {
        return db.runTransaction(async (transaction) => {
            // Revert old balance change
            const oldPartyRef = oldTx.partyType === "Farmer" 
                ? db.collection("farmers").doc(oldTx.partyId)
                : db.collection("shops").doc(oldTx.partyId);
            
            const oldPartyDoc = await transaction.get(oldPartyRef);
            const oldPartyBalance = oldPartyDoc.data().balance || 0.0;

            const oldTotalEffect = (oldTx.amount || 0) + (oldTx.discount || 0);
            const oldBalanceChange = oldTx.partyType === "Farmer"
                ? (oldTx.type === "Pay" ? -oldTotalEffect : oldTotalEffect)
                : (oldTx.type === "Receive" ? -oldTotalEffect : oldTotalEffect);

            let newPartyBalance = oldPartyBalance;
            let newPartyRef = oldPartyRef;

            if (oldTx.partyId !== newTx.partyId || oldTx.partyType !== newTx.partyType) {
                newPartyRef = newTx.partyType === "Farmer"
                    ? db.collection("farmers").doc(newTx.partyId)
                    : db.collection("shops").doc(newTx.partyId);
                const newPartyDoc = await transaction.get(newPartyRef);
                newPartyBalance = newPartyDoc.data().balance || 0.0;
            }

            const newTotalEffect = (newTx.amount || 0) + (newTx.discount || 0);
            const newBalanceChange = newTx.partyType === "Farmer"
                ? (newTx.type === "Pay" ? -newTotalEffect : newTotalEffect)
                : (newTx.type === "Receive" ? -newTotalEffect : newTotalEffect);

            const txRef = db.collection("paymentTransactions").doc(oldTx.id);
            transaction.set(txRef, { ...newTx, id: oldTx.id });

            if (oldTx.partyId === newTx.partyId && oldTx.partyType === newTx.partyType) {
                transaction.update(oldPartyRef, { balance: oldPartyBalance - oldBalanceChange + newBalanceChange });
            } else {
                // Update old party
                transaction.update(oldPartyRef, { balance: oldPartyBalance - oldBalanceChange });
                // Update new party
                transaction.update(newPartyRef, { balance: newPartyBalance + newBalanceChange });
            }
        });
    },

    getPaymentTransactionsForParty(partyId) {
        return this.payments.filter(p => p.partyId === partyId).sort((a,b) => b.date.localeCompare(a.date));
    },

    // --- Staff Users ---
    async addStaffUser(user) {
        return db.collection("staff_users").add(user);
    },

    async deleteStaffUser(id) {
        return db.collection("staff_users").doc(id).delete();
    },

    async updateStaffUser(user) {
        return db.collection("staff_users").doc(user.id).set(user);
    },

    async getStaffUserByUsername(username) {
        const snapshot = await db.collection("staff_users").where("username", "==", username).get();
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    }
};
