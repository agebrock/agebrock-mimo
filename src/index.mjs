import mingo from "mingo";
import { updateObject } from "mingo/updater";

function ensureArray(data) {
    if (Array.isArray(data) == false) {
        if(data instanceof Set) return Array.from(data);
        if(data instanceof Map) return Array.from(data.values());

        return Object.keys(data).map((key) => {
            return data[key];
        });
    }
    return data;
}


function find(...args) {
    return mingo.find.apply(null,args).all();
}


function findOne(...args) {
    return mingo.find.apply(null,args).next();
}

function exists(data, query) {
    return (findOne(data, query)) ? true : false;
}

function remove(data, query) {
    return mingo.remove(data, query);
}

function updateDocument(data, updateCmd) {
    return updateObject(data, updateCmd);
}

function update(data, query, updateCmd) {
    return mingo.find(data, query).map((item) => {
       return updateDocument(item, updateCmd);
    });
}

class Collection{
    constructor(data){
        this.collection = ensureArray(data);
    }
    /**
     * Performs a query on a collection and returns an array.
     *
     * @param criteria Query criteria
     * @param projection Projection criteria
     * @param options
     * @returns {Array} An Array of results
     */
    find = (...args)=>find.apply(this, [this.collection, ...args]);

    /**
     * Removes all matching objects from a collection and returns an array.
     * The original collection is modified.
     *
     * @param criteria Query criteria
     * @param options
     * @returns {Array} An Array of results
     */
    remove = (...args)=>{
        let newData =  remove.apply(this, [this.collection, ...args]);
        this.collection = newData;
        return newData;
    }
    /**
     * Performs a query on a collection
     *
     * @param criteria Query criteria
     * @param projection Projection criteria
     * @param options
     * @returns {Object} the matching object
     */
    findOne = (...args)=>findOne.apply(this, [this.collection, ...args]);
    /**
     * Performs a query returning true if a matching object exists
     *
     * @param criteria Query criteria
     * @param projection Projection criteria
     * @param options
     * @returns {boolean} true if matching object exists
     */
    exists = (...args)=>exists.apply(this, [this.collection, ...args]);
    /**
     * Updates the given object with the expression.
     *
     * @param expr The update expressions.
     * @param arrayFilters Filters to apply to nested items.
     * @param conditions Conditions to validate before performing update.
     * @param options Update options to override defaults.
     * @returns {Array<string>} A list of modified field paths in the object.
     */
    update = (...args)=>update.apply(this, [this.collection, ...args]);

    length = ()=>this.collection.length;
}

function collection(data){
    return new Collection(data);
}


export { find, findOne, exists, update, updateDocument, collection };

