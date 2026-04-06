const { BaseMailProvider } = require('./mail-base');
const { OTP_CODE_PATTERN } = require('./constants');
const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');

class GmailAliasProvider extends BaseMailProvider {
  constructor(config = {}) {
    super(config);
    // 直接硬编码你的配置，省去改其他配置文件的麻烦
    this.gmailUser = 'yilovesky520@gmail.com'; 
    this.gmailPass = 'rmbfwtttsecnxhog'; // 你刚才发的那个 16 位密码
  }

  // 1. 自动生成 Gmail 别名 (例如: baico+a1b2c@gmail.com)
  async createAddress() {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const aliasAddress = this.gmailUser.replace('@', `+${randomSuffix}@`);
    this._log(`生成 Gmail 别名地址: ${aliasAddress}`);
    return { address: aliasAddress };
  }

  // 2. 核心：每 5 秒去 Gmail 里抓一次验证码
  async waitForCode(email, timeout = 600, otpSentAt = Date.now()) {
    const deadline = Date.now() + timeout * 1000;
    
    const imapConfig = {
      imap: {
        user: this.gmailUser,
        password: this.gmailPass,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        authTimeout: 5000,
        tlsOptions: { rejectUnauthorized: false }
      }
    };

    this._log(`正在监控 Gmail 验证码，目标地址: ${email}...`);

    while (Date.now() < deadline) {
      let connection;
      try {
        connection = await imaps.connect(imapConfig);
        await connection.openBox('INBOX');

        // 搜索发往这个别名地址的所有未读邮件
        const searchCriteria = [['HEADER', 'TO', email]];
        const fetchOptions = { bodies: ['TEXT'], struct: true, markSeen: true };

        const messages = await connection.search(searchCriteria, fetchOptions);

        for (const item of messages) {
          const part = item.parts.find(p => p.which === 'TEXT');
          const mail = await simpleParser(part.body);
          const content = mail.text || mail.html;
          
          // 使用项目自带的正则匹配 6 位数字
          const match = content.match(OTP_CODE_PATTERN);
          if (match) {
            const code = match[1];
            this._log(`成功抓取到 OpenAI 验证码: ${code}`);
            connection.end();
            return code;
          }
        }
        connection.end();
      } catch (err) {
        this._log(`读取邮件出错 (可能在重试): ${err.message}`);
        if (connection) connection.end();
      }

      // 等待 5 秒再次查询
      await new Promise(r => setTimeout(r, 5000));
    }

    this._log('等待验证码超时，请检查 Gmail 是否收到邮件。');
    return null;
  }

  async init() {
    this._log("Gmail 别名模式已就绪 (无需启动浏览器)");
  }

  async close() {
    this._log("Gmail 模式已关闭");
  }
}

// 保持类名兼容，这样不需要改动其他文件的 import 语句
module.exports = { MailTempMail: GmailAliasProvider };
