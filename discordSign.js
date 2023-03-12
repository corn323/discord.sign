// @ts-check
const fs = require("fs");

const Discord = require("discord.js");
// const schedule = require('node-schedule');
let meetingVoiceChannelUser;
let userName;
let endEmbedDescription;
let memberName;
let data;
let guildMember;
let state;

/**
 * @class SingData
 * @classdesc 用於紀錄已簽名和未簽名的資料
 */
class SingData {
  /**
   * 創建一個新的 SingData 物件
   * @param {String[]} signed - 已簽名的資料
   * @param {String[]} unsigned - 未簽名的資料
   * @param {Boolean} isMeetingActive - 當前的簽名狀態，true 表示已全部簽名，false 表示還有未簽名的資料
   */
  constructor(signed = [], unsigned = [], isMeetingActive = false) {
    /**
     * 已簽名的資料
     * @type {String[]}
     */
    this.signed = signed;

    /**
     * 未簽名的資料
     * @type {String[]}
     */
    this.unsigned = unsigned;

    /**
     * 會議狀態，開會中是ture;否則為false
     * @type {Boolean}
     */
    this.isMeetingActive = isMeetingActive;
  }
}
let db = new SingData();

/**
 * @enum {string}
 * @readonly
 * @property {string} ADD - 表示狀態為添加
 * @property {string} REMOVE - 表示狀態為移除
 */
const State = Object.freeze({
  ADD: "add",
  REMOVE: "remove",
});

module.exports = class {
  /**
   * 創建一個新的 SignSystem 實例。
   * @param {Discord.Client} client - Discord.js 的 client 實例。
   * @param {Object} channels - 頻道。
   * @param {Discord.Snowflake} channels.meetingID - 會議文字頻道的ID。
   * @param {Discord.Snowflake} channels.voiceMeetingID - 會議語音頻道的ID。
   * @param {Object} options - 選項對象。
   * @param {fs.PathOrFileDescriptor} options.path - sign.json 檔案的路徑。
   * @param {Discord.Snowflake} options.formalMemberId - 正式成員角色的 ID。
   * @param {Discord.Snowflake} options.informalMemberId - 非正式成員角色的 ID。
   * @param {Discord.Snowflake} options.adminMemberId - 管理員成員角色的 ID。
   * @param {Discord.Snowflake} options.guildID - 伺服器的 ID。
   * @param {string} [options.signEmoji] - 簽名所使用的表情符號。
   */
  constructor(client, channels, options) {
    // this.client = client;
    // this.channals = channels;
    this.options = options;
    // 伺服器ID 292656013021282304
    client.guilds.fetch(options.guildID).then((guild) => {
      if (guild == null) throw new Error("伺服器錯誤");
      this.guild = guild;
      // 會議語音頻道ID 467589730733785098
      this.guild.channels.fetch(channels.voiceMeetingID).then((channel) => {
        if (!(channel instanceof Discord.VoiceChannel))
          throw new Error("會議語音頻道錯誤");
        this.meetingVoiceChannel = channel;
      });
      // 會議文字頻道ID 414639227213709313
      this.meetingMessageChannel = this.guild.channels.fetch(
        channels.meetingID
      );

      client.on("interactionCreate", async (interaction) => {
        if (!interaction.isCommand()) return;
        const { commandName } = interaction;
        if (commandName == "sign_check") {
          async function check(interaction) {
            db = await JSON.parse(
              fs.readFileSync(options.path, { encoding: "utf-8" })
            );
            data =
              ":pencil: 已簽到：" +
              "\n" +
              db.signed.join("\n") +
              "\n" +
              "🍞未簽到：" +
              "\n" +
              db.unsigned.join("\n");
            await interaction.reply({
              embeds: [
                new Discord.MessageEmbed()
                  .setColor("#4CCEF5")
                  .setTitle("點名狀況")
                  .setDescription(`${data}`)
                  .setTimestamp()
                  .setFooter("即時"),
              ],
            });
          }
          await check(interaction);
        }
      });
      client.on("messageReactionAdd", async (messageReaction, user) => {
        if (user.bot) return;
        state = "add";
        await this.sign(messageReaction, user, State.ADD);
      });
      client.on("messageReactionRemove", async (messageReaction, user) => {
        if (user.bot) return;
        state = "remove";
        await this.sign(messageReaction, user, State.REMOVE);
      });

      client.on("messageCreate", async (msg) => {
        if (msg.author.bot) return;
        if (msg.content == "會議結束") {
          await this.end(msg);
        }
      });
      client.on("ready", async () => {
        if (client.application == null) throw new Error("斜線指令註冊問題");
        const applicationCommandCheck =
          await client.application.commands.create(
            {
              name: "sign_check",
              description: "即時查看點名狀況",
            },
            options.guildID
          );
      });
      client.on("voiceStateUpdate", async (oldState, newState) => {
        await this.voiceState(oldState, newState);
      });
    });
  }

  /**
   *
   * @param {Discord.Snowflake} meetingStartMessageId 會議開始訊息的ID
   */
  async start(meetingStartMessageId) {
    db = await JSON.parse(
      fs.readFileSync(this.options.path, { encoding: "utf-8" })
    );
    db = new SingData();
    // 正式成員ID 591926695527841794
    const guildFormalMember = await this.guild.roles.fetch(
      this.options.formalMemberId,
      { force: true }
    );
    if (guildFormalMember == null) return Promise.reject("正式成員抓取錯誤");
    const guildformalRoleMembers = guildFormalMember.members;
    for (let formalName of guildformalRoleMembers) {
      const formalMembersName = await this.guild.members.fetch(formalName[0]);
      db.unsigned.push(formalMembersName.displayName);
      fs.writeFileSync(this.options.path, JSON.stringify(db, null, "\t"));
    }
    // 試用期成員ID 471545568787824640
    const guildInformalMember = await this.guild.roles.fetch(
      this.options.informalMemberId,
      { force: true }
    );
    if (guildInformalMember == null)
      return Promise.reject("試用期成員抓取錯誤");
    const guildInformalRoleMembers = guildInformalMember.members;
    for (let informalName of guildInformalRoleMembers) {
      const informalMembersName = await this.guild.members.fetch(
        informalName[0]
      );
      db.unsigned.push(informalMembersName.displayName);
      fs.writeFileSync(this.options.path, JSON.stringify(db, null, "\t"));
    }
    // 管組ID 412897305235030019
    const guildAdminMember = await this.guild.roles.fetch(
      this.options.adminMemberId,
      { force: true }
    );
    if (guildAdminMember == null) return Promise.reject("管組成員抓取錯誤");
    const guildAdminRoleMembers = guildAdminMember.members;
    for (let adminName of guildAdminRoleMembers) {
      const adminMembersName = await this.guild.members.fetch(adminName[0]);
      db.unsigned.push(adminMembersName.displayName);
      fs.writeFileSync(this.options.path, JSON.stringify(db, null, "\t"));
    }
    // 用於新增表情符號，訊息ID
    const messageChannel = await this.meetingMessageChannel;
    if (messageChannel == null || !messageChannel.isText())
      return Promise.reject("會議文字頻道抓取錯誤");
    const messageId = await messageChannel.messages.fetch(
      meetingStartMessageId
    );
    await messageId.react(this.options.signEmoji || "✅");
    db.isMeetingActive = true;
    fs.writeFileSync(this.options.path, JSON.stringify(db, null, "\t"));
  }

  /**
   * 用於處理點擊表情符號
   * @param {Discord.MessageReaction | Discord.PartialMessageReaction} messageReaction 表示該則訊息的表情符號
   * @param {Discord.User | Discord.PartialUser} user 點擊表情符號的使用者
   * @param {"add" | "remove"} state 新增或取消表情符號
   * @returns
   */
  async sign(messageReaction, user, state) {
    if (user.bot || messageReaction.emoji.name !== "✅") return;
    const voiceChannel = this.meetingVoiceChannel;
    if (voiceChannel == null || !voiceChannel.isVoice())
      return Promise.reject("會議語音頻道錯誤");
    meetingVoiceChannelUser = voiceChannel.members.find(
      (channelUser) => channelUser.id == user.id
    );
    db = JSON.parse(fs.readFileSync(this.options.path, { encoding: "utf-8" }));
    guildMember = await this.guild.members.fetch(user.id);
    memberName = guildMember.displayName;
    if (meetingVoiceChannelUser == undefined && state == "add") {
      await messageReaction.users.remove(user.id);
      await user.send("點名失敗!有在會議的語音頻道，並且會議開始後才能點名喔~");
    } else if (
      meetingVoiceChannelUser !== undefined &&
      db.isMeetingActive == true
    ) {
      switch (state) {
        case State.ADD:
          if (
            guildMember.roles.cache.hasAny(this.options.formalMemberId) || // 正式成員ID
            guildMember.roles.cache.hasAny(this.options.informalMemberId) || // 試用期成員ID
            guildMember.roles.cache.hasAny(this.options.adminMemberId) // 管組成員ID
          ) {
            let location = db.unsigned.indexOf(memberName);
            db.unsigned.splice(location, 1);
            db.signed.push(memberName);
            await user.send("完成點名");
          }
          break;
        case State.REMOVE:
          if (
            guildMember.roles.cache.hasAny(this.options.formalMemberId) || //正式成員ID
            guildMember.roles.cache.hasAny(this.options.informalMemberId) || // 試用期成員ID
            guildMember.roles.cache.hasAny(this.options.adminMemberId) // 管組成員ID
          ) {
            let location = db.signed.indexOf(memberName);
            db.signed.splice(location, 1);
            db.unsigned.push(memberName);
            await user.send("取消點名");
          }
          break;
        default:
          break;
      }
      fs.writeFileSync(this.options.path, JSON.stringify(db, null, "\t"));
    }
  }

  /**
   * 用於處理會議結束
   * @param {Discord.Message} msg
   * @returns
   */
  async end(msg) {
    db = JSON.parse(fs.readFileSync(this.options.path, { encoding: "utf-8" }));
    // 輸入[會議結束]頻道ID
    if (db.isMeetingActive == false) return;
    const messageChannel = await this.meetingMessageChannel;
    if (messageChannel == null || !messageChannel.isText())
      return Promise.reject("會議文字頻道錯誤");
    if (msg.channelId !== messageChannel.id) return;
    endEmbedDescription =
      "✏️ 已簽到：" +
      "\n" +
      db.signed.join("\n") +
      "\n" +
      "❌未簽到：" +
      "\n" +
      db.unsigned.join("\n");
    await msg.reply({
      embeds: [
        new Discord.MessageEmbed()
          .setColor("#4CCEF5")
          .setTitle("點名狀況")
          .setDescription(`${endEmbedDescription}`)
          .setTimestamp()
          .setFooter({ text: "截止" }),
      ],
    });
    db = new SingData();
    fs.writeFileSync(this.options.path, JSON.stringify(db, null, "\t"));
  }
  /**
   *
   * @param {Discord.VoiceState} oldState
   * @param {Discord.VoiceState} newState
   * @returns
   */
  async voiceState(oldState, newState) {
    if (oldState.channelId == newState.channelId) return;
    db = JSON.parse(fs.readFileSync(this.options.path, { encoding: "utf-8" }));
    if (db.isMeetingActive == false) return;
    if (newState.channelId == this.meetingVoiceChannel.id) {
      state = "enter";
    } else if (oldState.channelId == this.meetingVoiceChannel.id) {
      state = "leave";
    }
    if (newState.member == null) throw new Error(`語音頻道成員錯誤`);
    userName = await this.guild.members.fetch(newState.member.id);
    const messageChannel = await this.meetingMessageChannel;
    if (messageChannel == null || !messageChannel.isText())
      return Promise.reject("會議文字頻道錯誤");
    messageChannel.send(
      `${userName.displayName}${state === "enter" ? "進入" : "離開"}了${
        this.meetingVoiceChannel.name
      }頻道`
    );
  }
};
