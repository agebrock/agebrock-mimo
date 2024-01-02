import { collection } from '../index';



describe('find', () => {
    let data;

    beforeEach(() => {
        data = collection([
            { a: 1, b: 2 },
            { a: 2, b: 2 },
            { a: 3, b: 4 },
        ]);
    });

    it('should find 2 elements', () => {
        expect(data.find({ b: 2 })).toHaveLength(2);
    });

    it('should find 2 elements', () => {
        expect(data.find({ b: "notexist" })).toHaveLength(0);
    });

    it('should return one matching object', () => {
        expect(data.findOne({ a: 1 })).toEqual(expect.objectContaining({ a: 1 }));
    });

    it('should return true if a matching object exists', () => {
        expect(data.exists({ a: 1 })).toBe(true);
    });

    it('should return false if a matching object does not exist', () => {
        expect(data.exists({ a: 4 })).toBe(false);
    });

    it('should update a matching object', () => {
        data.update({ a: 1 }, {$set:{ c: 5 }});
        expect(data.findOne({ c: 5 })).toBeDefined();
    });

    it('should remove all matching object', () => {
        data.remove({a:1});
        expect(data.length()).toBe(2);
    });

    // Add more test cases here
});