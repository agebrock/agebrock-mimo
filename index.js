import mingo from "mingo";
import _ from "lodash";
import { updateObject } from "mingo/updater";

function ensureArray(data) {
    if (Array.isArray(data) == false) {
        data = _.map(data, (value) => value);
    }
    return data;
}

/**
 * @@param {Array|Object} data
 * @returns {Array} the result of the query
 */
function find(data, query) {
    return mingo.find(data, query).all();
}

/**
 * 
 * @param {*} data 
 * @param {*} query 
 * @returns 
 */
function findOne(data, query) {
    return mingo.find(data, query).next();
}

function exists(data, query) {
    return (findOne(data, query)) ? true : false;
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
    find = (query)=>find.call(null, this.collection, query);
    findOne = (query)=>findOne.call(null, this.collection, query);
    exists = (query)=>exists.call(null, this.collection, query);
    update = (query, updateCmd)=>update.call(null, this.collection, query, updateCmd);
}

function collection(data){
    return new Collection(data);
}


export { find, findOne, exists, update, updateDocument, collection };

