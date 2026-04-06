const { BaseMailProvider } = require('./mail-base');
const { OTP_CODE_PATTERN } = require('./constants');
const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');

/**
 * Gmail 别名邮箱提供商 (兼容 MREGISTER Next 架构)
 * 逻辑参考：基于 IMAP 协议自动抓取 OpenAI 6位验证码
 */
class GmailAliasProvider extends BaseMailProvider {
  constructor(config = {}) {
    super(config);
    // 🌟 [配置区域]: 填入你的 Gmail 信息
    this.gmailUser = 'yilovesky520@gmail.com'; 
    this.gmailPass = 'rmbfwtttsecnxhog'; // 你的 16 位专用密码
    
    this._usedMessageSignatures = new Set();
  }

  /**
   * 初始化：检查 IMAP 连接是否正常
   */
  async init() {
    this._log("📡 正在验证 Gmail IMAP 连接...");
    try {
      const connection = await this._getConn();
      connection.end();
      this._log("✅ Gmail 别名模式已就绪 (无需启动浏览器)");
    } catch (err) {
      this._log(`❌ Gmail 连接失败: ${err.message}`);
      throw new Error(`Gmail IMAP 登录失败，请检查账号或专用密码: ${err.message}`);
    }
  }

  /**
   * 生成地址：自动拼接 Gmail 别名 (例如: baico+abcd12@gmail.com)
   */
  async createAddress() {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const address = this.gmailUser.replace('@', `+${randomSuffix}@`);
    this._log(`✨ 已生成 Gmail 别名: ${address}`);
    // 返回对象格式以兼容原版调用处
    return { address, token: 'gmail-mode' };
  }

  /**
   * 核心逻辑：循环抓取验证码
   */
  async waitForCode(email, timeout = 600, otpSentAt = Date.now()) {
    const deadline = Date.now() + timeout * 1000;
    this._log(`🔍 开始监控邮件，目标: ${email} (超时: ${timeout}s)`);

    while (Date.now() < deadline) {
      let connection;
      try {
        connection = await this._getConn();
        await connection.openBox('INBOX');

        // 搜索发给这个别名地址的所有邮件
        const searchCriteria = [['HEADER', 'TO', email]];
        const fetchOptions = { bodies: ['TEXT'], struct: true, markSeen: true };

        const messages = await connection.search(searchCriteria, fetchOptions);

        for (const item of messages) {
          const part = item.parts.find(p => p.which === 'TEXT');
          const mail = await simpleParser(part.body);
          const content = mail.text || mail.html || "";
          
          // 🌟 [精准匹配]: 使用项目预定义的 OTP_CODE_PATTERN (通常是 \d{6})
          const match = content.match(OTP_CODE_PATTERN);
          const signature = `msg-${item.attributes.uid}-${item.attributes.date.getTime()}`;

          if (match && !this._usedMessageSignatures.has(signature)) {
            const code = match[1] || match[0];
            this._usedMessageSignatures.add(signature);
            this._log(`🔑 成功抓取 OpenAI 验证码: ${code}`);
            connection.end();
            return code;
          }
        }
        connection.end();
      } catch (err) {
        this._log(`⚠️ 轮询过程异常: ${err.message}`);
        if (connection) connection.end();
      }

      // 每 5 秒尝试一次，避免被 Google 暂时屏蔽
      await new Promise(r => setTimeout(r, 5000));
    }

    this._log('❌ 等待验证码超时，请确认 OpenAI 是否已发信。');
    return null;
  }

  /**
   * 内部方法：获取 IMAP 连接
   */
  async _getConn() {
    return await imaps.connect({
      imap: {
        user: this.gmailUser,
        password: this.gmailPass,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false }
      }
    });
  }

  async close() {
    this._log("📴 Gmail 模式已关闭");
  }
}

// 🌟 导出名称保持为 MailTempMail，这样你不需要修改别的文件
module.exports = { MailTempMail: GmailAliasProvider };
