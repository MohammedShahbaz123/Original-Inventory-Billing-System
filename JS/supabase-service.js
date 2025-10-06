// Supabase service layer for all database operations
class SupabaseService {
    static getSupabase() {
        const client = SupabaseConfig.getClient();
        if (!client) {
            throw new Error('Supabase client not initialized');
        }
        return client;
    }

    // Party operations
    static async getParties() {
        try {
            const supabase = this.getSupabase();
            const { data, error } = await supabase
                .from('parties')
                .select('*')
                .order('name');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching parties:', error);
            if (typeof Utils !== 'undefined') {
                Utils.showNotification('Error loading parties', 'error');
            }
            return [];
        }
    }

    static async createParty(partyData) {
        try {
            const supabase = this.getSupabase();
            const { data, error } = await supabase
                .from('parties')
                .insert([partyData])
                .select()
                .single();

            if (error) throw error;
            if (typeof Utils !== 'undefined') {
                Utils.showNotification('Party created successfully', 'success');
            }
            return data;
        } catch (error) {
            console.error('Error creating party:', error);
            if (typeof Utils !== 'undefined') {
                Utils.showNotification('Error creating party', 'error');
            }
            throw error;
        }
    }

    static async updateParty(id, partyData) {
        try {
            const supabase = this.getSupabase();
            const { data, error } = await supabase
                .from('parties')
                .update(partyData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            if (typeof Utils !== 'undefined') {
                Utils.showNotification('Party updated successfully', 'success');
            }
            return data;
        } catch (error) {
            console.error('Error updating party:', error);
            if (typeof Utils !== 'undefined') {
                Utils.showNotification('Error updating party', 'error');
            }
            throw error;
        }
    }

    static async deleteParty(id) {
        try {
            const supabase = this.getSupabase();
            const { error } = await supabase
                .from('parties')
                .delete()
                .eq('id', id);

            if (error) throw error;
            if (typeof Utils !== 'undefined') {
                Utils.showNotification('Party deleted successfully', 'success');
            }
        } catch (error) {
            console.error('Error deleting party:', error);
            if (typeof Utils !== 'undefined') {
                Utils.showNotification('Error deleting party', 'error');
            }
            throw error;
        }
    }

    // Item operations
    static async getItems() {
        try {
            const supabase = this.getSupabase();
            const { data, error } = await supabase
                .from('items')
                .select('*')
                .order('name');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching items:', error);
            if (typeof Utils !== 'undefined') {
                Utils.showNotification('Error loading items', 'error');
            }
            return [];
        }
    }

    static async createItem(itemData) {
        try {
            const supabase = this.getSupabase();
            const { data, error } = await supabase
                .from('items')
                .insert([itemData])
                .select()
                .single();

            if (error) throw error;
            if (typeof Utils !== 'undefined') {
                Utils.showNotification('Item created successfully', 'success');
            }
            return data;
        } catch (error) {
            console.error('Error creating item:', error);
            if (typeof Utils !== 'undefined') {
                Utils.showNotification('Error creating item', 'error');
            }
            throw error;
        }
    }

   // Add this to your SupabaseService class in supabase-service.js
static async updateItem(id, itemData) {
    try {
        const supabase = this.getSupabase();
        const { data, error } = await supabase
            .from('items')
            .update(itemData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (typeof Utils !== 'undefined') {
            Utils.showNotification('Item updated successfully', 'success');
        }
        return data;
    } catch (error) {
        console.error('Error updating item:', error);
        if (typeof Utils !== 'undefined') {
            Utils.showNotification('Error updating item', 'error');
        }
        throw error;
    }
}

    static async updateItemStock(id, newStock) {
        try {
            const supabase = this.getSupabase();
            const { data, error } = await supabase
                .from('items')
                .update({ stock: newStock })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating item stock:', error);
            throw error;
        }
    }
// Delete Item
    static async deleteItem(id) {
    try {
        const supabase = this.getSupabase();
        const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', id);

        if (error) throw error;
        Utils.showNotification('Item deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting item:', error);
        Utils.showNotification('Error deleting item', 'error');
        throw error;
    }
}

    // Sales operations
    static async getSales() {
        try {
            const supabase = this.getSupabase();
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    *,
                    parties (name),
                    sale_items (
                        items (name),
                        quantity,
                        price
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching sales:', error);
            if (typeof Utils !== 'undefined') {
                Utils.showNotification('Error loading sales', 'error');
            }
            return [];
        }
    }

    static async createSale(saleData, saleItems) {
        try {
            const supabase = this.getSupabase();
            
            // Start a transaction
            const { data: sale, error: saleError } = await supabase
                .from('sales')
                .insert([saleData])
                .select()
                .single();

            if (saleError) throw saleError;

            // Add sale items
            const saleItemsWithId = saleItems.map(item => ({
                ...item,
                sale_id: sale.id
            }));

            const { error: itemsError } = await supabase
                .from('sale_items')
                .insert(saleItemsWithId);

            if (itemsError) throw itemsError;

            // Update item stocks
            for (const item of saleItems) {
                const currentItem = await this.getItemById(item.item_id);
                const newStock = currentItem.stock - item.quantity;
                await this.updateItemStock(item.item_id, newStock);
            }

            if (typeof Utils !== 'undefined') {
                Utils.showNotification('Sale invoice created successfully', 'success');
            }
            return sale;
        } catch (error) {
            console.error('Error creating sale:', error);
            if (typeof Utils !== 'undefined') {
                Utils.showNotification('Error creating sale invoice', 'error');
            }
            throw error;
        }
    }

    static async getItemById(id) {
        try {
            const supabase = this.getSupabase();
            const { data, error } = await supabase
                .from('items')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching item:', error);
            throw error;
        }
    }

    // Purchase operations
    static async getPurchases() {
        try {
            const supabase = this.getSupabase();
            const { data, error } = await supabase
                .from('purchases')
                .select(`
                    *,
                    parties (name),
                    purchase_items (
                        items (name),
                        quantity,
                        price
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching purchases:', error);
            if (typeof Utils !== 'undefined') {
                Utils.showNotification('Error loading purchases', 'error');
            }
            return [];
        }
    }

    static async createPurchase(purchaseData, purchaseItems) {
        try {
            const supabase = this.getSupabase();
            
            const { data: purchase, error: purchaseError } = await supabase
                .from('purchases')
                .insert([purchaseData])
                .select()
                .single();

            if (purchaseError) throw purchaseError;

            const purchaseItemsWithId = purchaseItems.map(item => ({
                ...item,
                purchase_id: purchase.id
            }));

            const { error: itemsError } = await supabase
                .from('purchase_items')
                .insert(purchaseItemsWithId);

            if (itemsError) throw itemsError;

            // Update item stocks
            for (const item of purchaseItems) {
                const currentItem = await this.getItemById(item.item_id);
                const newStock = currentItem.stock + item.quantity;
                await this.updateItemStock(item.item_id, newStock);
            }

            if (typeof Utils !== 'undefined') {
                Utils.showNotification('Purchase invoice created successfully', 'success');
            }
            return purchase;
        } catch (error) {
            console.error('Error creating purchase:', error);
            if (typeof Utils !== 'undefined') {
                Utils.showNotification('Error creating purchase invoice', 'error');
            }
            throw error;
        }
    }

    // Dashboard data
    static async getDashboardData() {
        try {
            const [items, parties, sales, purchases] = await Promise.all([
                this.getItems(),
                this.getParties(),
                this.getSales(),
                this.getPurchases()
            ]);

            return {
                items,
                parties,
                sales,
                purchases
            };
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            throw error;
        }
    }
}