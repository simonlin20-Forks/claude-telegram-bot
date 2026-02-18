# Claude Telegram Bot - Systemd 服務管理

## 服務狀態

Bot 已設定為 systemd 服務，具備以下功能：
- 當機自動重啟（5 秒後）
- 開機自動啟動
- 統一管理啟動/停止/日誌

## 常用指令

```bash
# 查看狀態
sudo systemctl status claude-telegram-bot

# 啟動
sudo systemctl start claude-telegram-bot

# 停止
sudo systemctl stop claude-telegram-bot

# 重啟
sudo systemctl restart claude-telegram-bot

# 查看即時日誌
sudo journalctl -u claude-telegram-bot -f

# 查看最近 100 行日誌
sudo journalctl -u claude-telegram-bot -n 100

# 停用開機自動啟動
sudo systemctl disable claude-telegram-bot

# 啟用開機自動啟動
sudo systemctl enable claude-telegram-bot
```

## 服務設定檔

路徑：`/etc/systemd/system/claude-telegram-bot.service`

```ini
[Unit]
Description=Claude Telegram Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/repository/claude-telegram-bot
ExecStart=/home/ubuntu/.bun/bin/bun run src/index.ts
Restart=always
RestartSec=5
Environment=PATH=/home/ubuntu/.bun/bin:/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
```

## 修改設定後

如果修改了 `.env` 或服務設定檔，需要重啟：

```bash
# 修改 .env 後
sudo systemctl restart claude-telegram-bot

# 修改 service 檔後
sudo systemctl daemon-reload
sudo systemctl restart claude-telegram-bot
```

## 故障排除

```bash
# 查看為什麼啟動失敗
sudo journalctl -u claude-telegram-bot -n 50 --no-pager

# 確認 bun 路徑正確
/home/ubuntu/.bun/bin/bun --version

# 手動測試啟動（看即時錯誤）
cd /home/ubuntu/repository/claude-telegram-bot
/home/ubuntu/.bun/bin/bun run src/index.ts
```
