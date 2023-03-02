[![](https://img.shields.io/badge/-website-blue)](https://web.corn323.com)

![npm version](https://img.shields.io/badge/npm%20version-1.1.0-blue)

# SignSystem
#### A simple roll-call-system for Discord. You can have meeting at Discord.

# 簽到系統
#### 此簽到系統基於discord.js@13.3.1開發，可在discord.js@13.10.3上正常運行，用於在Discord會議上進行簽到。
#### 目前版本：1.1.1(僅更改README內容)

## 如何使用
#### 在你的Discord伺服器上安裝discord.js，並把此系統的程式碼放到你的檔案中。你需要先在Discord Developer Portal中建立好一個Bot，並在機器人中心中取得機器人的TOKEN，以及在你的伺服器中創建好所需要的頻道和角色。

### 你可以依照以下的程式碼來使用簽到系統：

```js
const { Client } = require('discord.js');
const SignSystem = require('./signSystem');

const client = new Client();
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  const channels = {
    meetingID: '414639227213709313', // 會議文字頻道的ID
    voiceMeetingID: '467589730733785098', // 會議語音頻道的ID
  };
  const options = {
    path: 'sign.json', // sign.json檔案的路徑
    formalMemberId: '123456789012345678', // 正式成員角色的ID
    informalMemberId: '123456789012345678', // 非正式成員角色的ID
    adminMemberId: '123456789012345678', // 管理員成員角色的ID
    guildID: '292656013021282304', // 伺服器的ID
    signEmoji: '✅', // 簽名所使用的表情符號
  };
  const signSystem = new SignSystem(client, channels, options);
});
client.login('your-token-goes-here');
```

## 本系統中有一個指令：

/sign_check : 檢查當前的簽到情況

## 提前準備的資訊
#### 需要在你的伺服器中創建以下的頻道：

1.會議語音頻道
2.會議文字頻道

#### 此外，你也需要為以下的角色指定一個ID：

1.正式成員
2.非正式成員
3.管理員成員

#### 備註
若有需要，可以使用`node-schedule`這個套件來輔助使用的點名系統

Email:contact@corn323.com
Discord:玉米#9093

Made By RSpirit and Corn323