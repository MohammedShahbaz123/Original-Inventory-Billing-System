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

    // In your supabase-service.js, modify the createSale function:
static async createSale(saleData, saleItems) {
    try {
        console.log('🔍 createSale called with:', { saleData, saleItems });
        
        const supabase = this.getSupabase();
        
        // Validate required fields 
        if (!saleData.party_id) {
            throw new Error('Party ID is required');
        }
        if (!saleData.invoice_date) {
            throw new Error('Invoice date is required');
        }
        if (!saleItems || saleItems.length === 0) {
            throw new Error('At least one sale item is required');
        }

        // Validate sale items
        saleItems.forEach((item, index) => {
            if (!item.item_id) throw new Error(`Item ${index + 1}: Item ID is required`);
            if (!item.quantity || item.quantity <= 0) throw new Error(`Item ${index + 1}: Valid quantity is required`);
            if (!item.price || item.price < 0) throw new Error(`Item ${index + 1}: Valid price is required`);
        });

        console.log('✅ Data validation passed');
        
        // Generate invoice number if not provided
let invoice_number = saleData.invoice_number;
if (!invoice_number) {
    const nextNumber = await this.getNextInvoiceNumber();
    // Use simple numbers: 1, 2, 3 instead of INV-0001
    invoice_number = nextNumber.toString();
}
        
        // Calculate total amount
        const total_amount = saleItems.reduce((total, item) => total + (item.quantity * item.price), 0);
        
        // Create sale record
const saleRecord = {
    party_id: saleData.party_id,
    invoice_date: saleData.invoice_date, // This should be just the date without time
    invoice_number: invoice_number,
    total_amount: total_amount,
    notes: saleData.notes || null,
    created_at: new Date().toISOString()
};

        console.log('📝 Sale record to insert:', saleRecord);
        
        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert([saleRecord])
            .select()
            .single();

        if (saleError) {
            console.error('❌ Sale creation error:', saleError);
            throw new Error(`Failed to create sale: ${saleError.message}`);
        }

        console.log('✅ Sale created:', sale);

        // FIX: Add sale items WITH subtotal calculation
        const saleItemsWithId = saleItems.map(item => ({
            sale_id: sale.id,
            item_id: item.item_id,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.quantity * item.price  // ADD THIS LINE
        }));

        console.log('📦 Sale items to insert:', saleItemsWithId);

        const { error: itemsError } = await supabase
            .from('sale_items')
            .insert(saleItemsWithId);

        if (itemsError) {
            console.error('❌ Sale items creation error:', itemsError);
            throw new Error(`Failed to create sale items: ${itemsError.message}`);
        }

        console.log('✅ Sale items created');

        // Update item stocks
        for (const item of saleItems) {
            try {
                const currentItem = await this.getItemById(item.item_id);
                console.log(`📊 Current stock for item ${item.item_id}:`, currentItem.stock);
                
                const newStock = currentItem.stock - item.quantity;
                if (newStock < 0) {
                    throw new Error(`Insufficient stock for ${currentItem.name}. Available: ${currentItem.stock}, Requested: ${item.quantity}`);
                }
                
                await this.updateItemStock(item.item_id, newStock);
                console.log(`✅ Stock updated for item ${item.item_id}: ${newStock}`);
            } catch (error) {
                console.error(`❌ Stock update error for item ${item.item_id}:`, error);
                throw error;
            }
        }

        Utils.showNotification('Sale invoice created successfully', 'success');
        return sale;
        
    } catch (error) {
        console.error('💥 Error creating sale:', error);
        Utils.showNotification(error.message || 'Error creating sale invoice', 'error');
        throw error;
    }
}

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
            .order('invoice_date', { ascending: false }); // Now using invoice_date

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

static async getNextInvoiceNumber() {
    try {
        const supabase = this.getSupabase();
        const { data, error } = await supabase
            .from('sales')
            .select('invoice_number')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        console.log('📊 Current invoice data:', data);

        if (data && data.length > 0 && data[0].invoice_number) {
            const lastInvoice = data[0].invoice_number;
            console.log('🔍 Last invoice number:', lastInvoice);
            
            // If it's already a simple number, use it
            if (!isNaN(lastInvoice)) {
                return parseInt(lastInvoice) + 1;
            }
            
            // If it has INV- prefix, extract the number
            if (lastInvoice.startsWith('INV-')) {
                const numberPart = lastInvoice.replace('INV-', '');
                return parseInt(numberPart) + 1;
            }
            
            // Default: start from 1 if can't parse
            return 1;
        }
        
        console.log('🚀 Starting from invoice number 1');
        return 1;
        
    } catch (error) {
        console.error('Error getting next invoice number:', error);
        return 1;
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