const express = require('express');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

mongoose.connect('mongodb://localhost:27017/my_database');
const db = mongoose.connection;
db.on('error', () => {
    console.log('MongoDB Connection Error....');
})
const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    description: String,
    category: String,
    imagePath: String
});
const Product = mongoose.model('Product', productSchema);

const app = express();
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

app.use('/uploads', express.static('uploads'))

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
})
const upload = multer({ storage: storage });

app.get('/products/new', (req, res) => {
    res.render('new-product', { errors: null });
});

app.get('/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.render('product-list', { products });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.delete('/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).send('Product not found');
        }
        res.redirect('/products');
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get('/products/:id/edit', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).send('Product not found');
        }
        res.render('edit-product', { product, errors: null });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.put('/products/:id', upload.single('image'), [
    body('name').isLength({ min: 5 }).withMessage('Name is required with min 5 chars'),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('description').notEmpty().withMessage('Description is required'),
    body('category').notEmpty().withMessage('Category is required'),
    // body('image').custom((value, { req }) => {
    //     if (!req.file) {
    //         throw new Error('Image is required');
    //     }
    //     return true;
    // })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const product = await Product.findById(req.params.id);
        return res.render('edit-product', { product, errors: errors.array() });
    }
    try {
        const updateData = req.body;
        if (req.file) {
            updateData.imagePath = req.file.filename;
        }
        const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!product) {
            return res.status(404).send('Product not found');
        }
        res.redirect('/products');
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/products/submit', upload.single('image'), [
    body('name').isLength({ min: 5 }).withMessage('Name is required with min 5 chars'),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('description').notEmpty().withMessage('Description is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('image').custom((value, { req }) => {
        if (!req.file) {
            throw new Error('Image is required');
        }
        return true;
    })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('new-product', { errors: errors.array() });
    }
    try {
        const product = new Product(req.body);
        product.imagePath = req.file.filename;
        await product.save();
        res.redirect('/products');
    } catch (err) {
        res.status(500).send(err);
    }
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
