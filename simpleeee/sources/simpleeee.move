/// Module: simpleeee
module simpleeee::simpleeee {
    use sui::event;
    
    public struct Event has copy, drop, store {
        value: u64
    }
    
    public fun oumu(n: u64): u64 {
        n
    }
    
    public fun double(n: u64) {
        let result = n * 2;
        event::emit(Event {value: result});
    }
    
    // #[test]
    // fun test_double() {
    //     let d = double(2);
        
    //     assert!(d == 4)
    // }
}

module simpleeee::own {
    use simpleeee::paon::{Locked, Key};
    
    public struct Escrow<T: key + store> has key {
        id: UID,
        sender: address,
        recipient: address,
        exchange_key: ID,
        escrowed_key: ID,
        escrowed: T,
    }
    
    /// The `sender` and `recipient` of the two escrowed objects do not match
    const EMismatchedSenderRecipient: u64 = 0;

    /// The `exchange_key` fields of the two escrowed objects do not match
    const EMismatchedExchangeObject: u64 = 1;
    
    public fun create<T: key + store>(
        key: Key,
        locked: Locked<T>,
        exchange_key: ID,
        recipient: address,
        custodian: address,
        ctx: &mut TxContext,
    ) {
        let escrow = Escrow {
            id: object::new(ctx),
            sender: ctx.sender(),
            recipient,
            exchange_key,
            escrowed_key: object::id(&key),
            escrowed: locked.unlock(key),
        };
        
        transfer::transfer(escrow, custodian);
    }
    
    public fun swap<T: key + store, U: key + store>(
        obj1: Escrow<T>,
        obj2: Escrow<U>,
    ) {
        let Escrow {
                id: id1,
                sender: sender1,
                recipient: recipient1,
                exchange_key: exchange_key1,
                escrowed_key: escrowed_key1,
                escrowed: escrowed1,
        } = obj1;

        let Escrow {
                id: id2,
                sender: sender2,
                recipient: recipient2,
                exchange_key: exchange_key2,
                escrowed_key: escrowed_key2,
                escrowed: escrowed2,
        } = obj2;
        id1.delete();
        id2.delete();
        
        // Make sure the sender and recipient match each other
        assert!(sender1 == recipient2, EMismatchedSenderRecipient);
        assert!(sender2 == recipient1, EMismatchedSenderRecipient);

        assert!(escrowed_key1 == exchange_key2, EMismatchedExchangeObject);
        assert!(escrowed_key2 == exchange_key1, EMismatchedExchangeObject);
        
        transfer::public_transfer(escrowed1, recipient1);
        transfer::public_transfer(escrowed2, recipient2);
    }
    
    public fun return_to_sender<T: key + store>(obj: Escrow<T>) {
        let Escrow {
                id,
                sender,
                recipient: _,
                exchange_key: _,
                escrowed_key: _,
                escrowed,
        } = obj;
        id.delete();
        transfer::public_transfer(escrowed, sender);
    }
}


module simpleeee::paon {
    use sui::object::{Self, ID, UID};
    use sui::tx_context::TxContext;
    
    public struct Locked<T: store> has key, store {
        id: UID,
        key: ID,
        obj: T,
    }
    
    public struct Key has key, store {
        id: UID,
    }
    
    const ELockKeyMismatch: u64 = 0;
    
    public struct FakeCoin has key, store {
        id: UID,
        amount: u8,
    }
    
    public fun lock_fake_coin(amount: u8, ctx: &mut TxContext): (Locked<FakeCoin>, Key) {
        let fc = FakeCoin {id: object::new(ctx), amount};
                
        lock(fc, ctx)
    }
    
    public fun fake_coin(amount: u8, ctx: &mut TxContext): (FakeCoin) {
        let fc = FakeCoin {id: object::new(ctx), amount};
                
        fc
    }
    
    public fun lock<T: store>(obj: T, ctx: &mut TxContext): (Locked<T>, Key) {
        let key = Key { id: object::new(ctx) };
        let lock = Locked {
            id: object::new(ctx),
            key: object::id(&key),
            obj,
        };
        
        (lock, key)
    }
    
    public fun unlock<T: store>(locked: Locked<T>, key: Key): T {
        assert!(locked.key == object::id(&key), ELockKeyMismatch);
        let Key {id} = key;
        object::delete(id);
        
        let Locked {id, key: _, obj} = locked;
        object::delete(id);
        obj
    }
}


module simpleeee::share {
    use sui::{
        event,
        dynamic_object_field::{Self as dof}
    };
    
    use simpleeee::paon::{Locked, Key};
    
    public struct EscrowedObjectKey has copy, store, drop {}
    
    public struct Escrow<phantom T: key + store> has key, store {
        id: UID,
        sender: address,
        recipient: address,
        exchange_key: ID,
    }
    
    public struct EscrowCreated has copy, drop {
        /// the ID of the escrow that was created
        escrow_id: ID,
        /// The ID of the `Key` that unlocks the requested object.
        key_id: ID,
        /// The id of the sender who'll receive `T` upon swap
        sender: address,
        /// The (original) recipient of the escrowed object
        recipient: address,
        /// The ID of the escrowed item
        item_id: ID,
    }
    
    public struct EscrowSwapped has copy, drop {
        escrow_id: ID
    }

    public struct EscrowCancelled has copy, drop {
        escrow_id: ID
    }
    
    const EMismatchedSenderRecipient: u64 = 0;
    const EMismatchedExchangeObject: u64 = 1;
    
    public fun create<T: key + store>(
        escrowed: T,
        exchange_key: ID,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        let mut escrow = Escrow<T> {
            id: object::new(ctx),
            sender: ctx.sender(),
            recipient,
            exchange_key
        };
        
        event::emit(EscrowCreated {
            escrow_id: object::id(&escrow),
            key_id: exchange_key,
            sender: escrow.sender,
            recipient,
            item_id: object::id(&escrowed),
        });
        
        dof::add(&mut escrow.id, EscrowedObjectKey {}, escrowed);
        
        transfer::public_share_object(escrow);
    }
    
    public fun swap<T: key + store, U: key + store>(
        mut escrow: Escrow<T>,
        key: Key,
        locked: Locked<U>,
        ctx: &TxContext,
    ): T {
        let escrowed = dof::remove<EscrowedObjectKey, T>(&mut escrow.id, EscrowedObjectKey {});
        
        let Escrow {
            id,
            sender,
            recipient,
            exchange_key,
        } = escrow;
        
        assert!(recipient == ctx.sender(), EMismatchedSenderRecipient);
        assert!(exchange_key == object::id(&key), EMismatchedExchangeObject);
        
        transfer::public_transfer(locked.unlock(key), sender);
        
        event::emit(EscrowSwapped {
                escrow_id: id.to_inner(),
        });
        
        id.delete();
        
        escrowed
    }
    
    public fun return_to_sender<T: key + store>(
            mut escrow: Escrow<T>,
            ctx: &TxContext
    ): T {

            event::emit(EscrowCancelled {
                    escrow_id: object::id(&escrow)
            });

            let escrowed = dof::remove<EscrowedObjectKey, T>(&mut escrow.id, EscrowedObjectKey {});

            let Escrow {
                    id,
                    sender,
                    recipient: _,
                    exchange_key: _,
            } = escrow;

            assert!(sender == ctx.sender(), EMismatchedSenderRecipient);
            id.delete();
            escrowed
    }
}
