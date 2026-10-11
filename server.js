const express = require('express');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const FormData = require('form-data');

const app = express();
const upload = multer({ dest: 'uploads/' });

// اطمینان از وجود پوشه uploads
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.use(express.json());
app.use(express.static(__dirname));

// دریافت امن توکن و آیدی ادمین از متغیرهای سرور Render
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// API خواندن تنظیمات
app.get('/api/config', (req, res) => {
  try {
    const data = fs.readFileSync('config.json', 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read config' });
  }
});

// API ذخیره تنظیمات از پنل ادمین
app.post('/api/config', (req, res) => {
  try {
    fs.writeFileSync('config.json', JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// API ثبت سفارش از مینی‌اپ و ارسال به تلگرام
app.post('/api/submit-order', upload.any(), async (req, res) => {
  try {
    const { service_title, user_info } = req.body;
    let user = { first_name: 'ناشناس', id: '-' };
    if (user_info) {
      try { user = JSON.parse(user_info); } catch (e) {}
    }

    let messageText = 🔔 *سفارش جدید کافی‌نت دریافت شد*\n\n;
    messageText += 📋 *نوع خدمت:* ${service_title || 'نامشخص'}\n;
    messageText += 👤 *مشتری:* ${user.first_name} (آیدی عددی: \${user.id}\)\n\n;
    messageText += 📑 *اطلاعات تکمیل‌شده:*\n;

    for (let key in req.body) {
      if (!['service_id', 'service_title', 'user_info'].includes(key)) {
        messageText += ▫️ *${key}:* ${req.body[key]}\n;
      }
    }

    // ارسال متن مشخصات سفارش به تلگرام شما
    if (BOT_TOKEN && ADMIN_CHAT_ID) {
      await axios.post(https://api.telegram.org/bot${BOT_TOKEN}/sendMessage, {
        chat_id: ADMIN_CHAT_ID,
        text: messageText,
        parse_mode: 'Markdown'
      });

      // ارسال مدارک و تصویر فیش واریزی به تلگرام شما
      if (req.files && req.files.length > 0) {
        for (let file of req.files) {
          const form = new FormData();
          form.append('chat_id', ADMIN_CHAT_ID);
          form.append('caption', 📎 پیوست: ${file.fieldname} (${file.originalname}));
          form.append('document', fs.createReadStream(file.path), file.originalname);

          await axios.post(https://api.telegram.org/bot${BOT_TOKEN}/sendDocument, form, {
            headers: form.getHeaders()
          });

          // حذف فایل از حافظه موقت سرور پس از ارسال موفق
          fs.unlinkSync(file.path);
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error submitting order:', err);
    res.status(500).json({ error: 'Order submission failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(Server is running on port ${PORT}));