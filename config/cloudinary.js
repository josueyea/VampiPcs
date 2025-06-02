// config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: 'drgjc43ss',
  api_key: '493627146323979',
  api_secret: 'f3vkusu4oOXZcAQZxqmiwbVglKg'
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'perfiles', // Nombre de carpeta en tu cuenta Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

module.exports = { cloudinary, storage };
