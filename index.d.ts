/**
 *
 * @param {Array,Object} data
 * @param {Object} query
 * @returns
 */
export function find(data: any, query: Object): any;
export function findOne(data: any, query: any): any;
export function exists(data: any, query: any): boolean;
export function update(data: any, query: any, updateCmd: any): any;
export function updateDocument(data: any, updateCmd: any): any;
export function collection(data: any): Collection;
declare class Collection {
    constructor(data: any);
    collection: any;
    find: (query: any) => any;
    findOne: (query: any) => any;
    exists: (query: any) => boolean;
    update: (query: any, updateCmd: any) => any;
}
export {};
