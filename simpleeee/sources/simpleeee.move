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
