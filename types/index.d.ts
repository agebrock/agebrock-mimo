export function find(...args: any[]): unknown[];
export function findOne(...args: any[]): unknown;
export function exists(data: any, query: any): boolean;
export function update(data: any, query: any, updateCmd: any): string[][];
export function updateDocument(data: any, updateCmd: any): string[];
export function collection(data: any): Collection;
declare class Collection {
    constructor(data: any);
    collection: any[];
    /**
     * Performs a query on a collection and returns an array.
     *
     * @param criteria Query criteria
     * @param projection Projection criteria
     * @param options
     * @returns {Array} An Array of results
     */
    find: (...args: any[]) => any[];
    /**
     * Removes all matching objects from a collection and returns an array.
     * The original collection is modified.
     *
     * @param criteria Query criteria
     * @param options
     * @returns {Array} An Array of results
     */
    remove: (...args: any[]) => any[];
    /**
     * Performs a query on a collection
     *
     * @param criteria Query criteria
     * @param projection Projection criteria
     * @param options
     * @returns {Object} the matching object
     */
    findOne: (...args: any[]) => Object;
    /**
     * Performs a query returning true if a matching object exists
     *
     * @param criteria Query criteria
     * @param projection Projection criteria
     * @param options
     * @returns {boolean} true if matching object exists
     */
    exists: (...args: any[]) => boolean;
    /**
     * Updates the given object with the expression.
     *
     * @param expr The update expressions.
     * @param arrayFilters Filters to apply to nested items.
     * @param conditions Conditions to validate before performing update.
     * @param options Update options to override defaults.
     * @returns {Array<string>} A list of modified field paths in the object.
     */
    update: (...args: any[]) => Array<string>;
    length: () => number;
}
export {};
