# Mingo Collection for Convenient MongoDB-like Operations

## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)
  - [Example Usage](#example-usage)
- [Contributions](#contributions)
- [License](#license)
- [Credits](#credits)
- [Contact](#contact)

## Introduction

This project provides a convenient way to perform MongoDB-like operations on JavaScript data collections using the `Collection` class from the Mingo-Utilities library. It simplifies the process of querying, updating, and checking the existence of documents within your data.

## Installation

To use this library in your project, you can install it via npm:

```bash
npm install agebrock-mimo
```

## Usage

Import the `Collection` class from the library as follows:

```javascript
import { Collection } from "agebrock-mimo";
```

### Example Usage

Suppose you have a collection of data and want to perform various operations on it. Here's an example of how to use the `Collection` class in your code:

```javascript
import { Collection } from "agebrock-mimo";

// Create a collection instance with sample data
const data = new Collection([
    { a: 1, b: 2 },
    { a: 2, b: 2 },
    { a: 3, b: 4 },
]);

// Find documents that match a query
const result = data.find({ b: 2 });

// Find the first document that matches a query
const firstResult = data.findOne({ a: 1 });

// Check if a document matching a query exists
const documentExists = data.exists({ a: 1 });

// Update documents based on a query
data.update({ a: 1 }, { $set: { c: 5 } });

// Add more operations as needed
```

## Browser Usage
I recently added support for browser usage. To use this library in your browser, I did this for a personal project so please feel free to use it as you wish. 
The client library is located in the dist/browser folder. Feel free to submit a pull request if you have any improvements. Or suggestions on how to improve it, since I 
am not doing much client side development. 
```javascript
// Import the library this will expose the mimo object
let result = mimo.collectionn([{a:1}]);
```



In this example, we create a `Collection` instance with sample data and use its methods (`find`, `findOne`, `exists`, `update`) for various operations. This allows you to easily work with collections and perform MongoDB-like operations in your code.

## Contributions

Contributions are welcome! If you have any suggestions, bug fixes, or improvements, please feel free to open an issue or submit a pull request on [GitHub](https://github.com/your-repo-link).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

This project is powered by the Mingo library [npm](https://www.npmjs.com/package/mingo)

## Contact

If you have any questions or need further assistance, please fill an issue.