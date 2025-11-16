import fs from 'fs';

const products = JSON.parse(fs.readFileSync(`${__dirname}/../data/products.json`));

console.log(products);

const getProducts = (req, res) => { 
    const id = req.params.id * 1;

    // const 
}