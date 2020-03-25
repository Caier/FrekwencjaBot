const Discord = require("discord.js");
const fs = require("fs-extra");
const path = require("path");

class Frekwencja extends Discord.Client {
    constructor(vars = {}, color = "#FFFFFE", prefix = '.') {
        super();
        this.prefix = prefix;
        this.sysColor = color;
        this.RichEmbed = Discord.RichEmbed;
        this.vars = Object.assign({}, process.env, vars);
        this._ensureVars();
        this.commands = this._loadCommands();
        this._start();
    }

    _ensureVars() {
        let reqVars = ["TOKEN", "BOT_OWNER"];
        let missVars = reqVars.filter(v => !this.vars[v]);
        if(missVars != 0)
            throw Error("Missing some requred variables: " + missVars.join(", "));
    }

    _loadCommands() {
        let cmds = new Discord.Collection();
        let cmdir = path.join(__dirname, "commands");
        let cmdFiles = fs.readdirSync(cmdir).filter(f => f.endsWith(".js"));
        for(let cmdName of cmdFiles) {
            let cmdals = [cmdName.slice(0, -3)];
            let temp = require(path.join(cmdir, cmdName));
            if(temp.aliases)
                cmdals.push(...temp.aliases);
            for(let alias of cmdals)
                cmds.set(alias, temp)
        }
        return cmds;
    }

    _start() {
        this.login(this.vars.TOKEN);
        this.on("ready", () => this._onReady());
        this.on("message", msg => this._onMessage(msg));
        this.on("disconnect", () => this._reconnect());
        this.on("error", err => console.error("Websocket error: " + err.message));
        this.on("reconnecting", () => console.log("Reconnecting to Discord..."));
    }

    _reconnect() {
        console.error("Kardynalny connecton with discord error, retrying in 30 seconds.");
        setTimeout(() => this.login(this.vars.TOKEN).catch(e => this.reconnect(e)), 30000);
    }

    _onReady() {
        console.log(`(re)Logged in as ${this.user.tag}`);
    }

    async _onMessage(msg) {
        let prefix = this.prefix;
        msg.prefix = prefix;
        let args = this.getArgs(msg.content, prefix);
        
        try {
            if(this.commands.has(args[0])) {
                let cmd = this.commands.get(args[0]);
                if(cmd.ownerOnly && msg.author.id != this.vars.BOT_OWNER)
                    msg.channel.send(this.embgen(this.sysColor, "**Z tej komendy może korzystać tylko owner bota!**"));
                else if(cmd.notdm && msg.channel.type == 'dm')
                    msg.channel.send(this.embgen(this.sysColor, "**Z tej komendy nie można korzystać na PRIV!**"));
                else if(cmd.permissions && !cmd.permissions.every(v => msg.member.permissions.toArray().includes(v)))
                    msg.channel.send(this.embgen(this.sysColor, `**Nie posiadasz odpowiednich uprawnień:**\n${cmd.permissions.filter(p => !msg.member.permissions.toArray().includes(p)).join("\n")}`));
                else 
                    await cmd.execute(msg, args, this);
            }
        }
        catch(err) {
            console.error(`Error while executing command ${args[0]}: ${err.stack}`);
            msg.channel.send(this.embgen(this.sysColor, `**Napotkano na błąd podczas wykonywania tej komendy :(**\n${err.message}`));
        }
    }

    getArgs(content, prefix, splitter, freeargs, arrayExpected) {
        content = content.slice(prefix.length);
        let args = [];
        if(splitter) 
            content = content.split(splitter);
        args.push(...(splitter ? content[0] : content).split(" ").map(v => v.trim()).filter(v => v != " " && v != ""));
        if(freeargs)
            args = [...args.slice(0,freeargs), args.slice(freeargs).join(" ")];
        if(splitter)
            args.push(...content.slice(1).map(v => v.trim()));
        while(arrayExpected && args.some(v => v[0] == '[') && args.some(v => v[v.length-1] == ']')) {
            let beg = args.findIndex(v => v[0] == '[');
            let end = args.findIndex(v => v[v.length-1] == ']')+1;
            if(end <= beg) break;
            args = [...args.slice(0, beg), [...args.slice(beg, end).join("").split(",").map(v => v[0] == '[' && v.slice(1) || v).map(v => v.endsWith(']') && v.slice(0, -1) || v)], ...args.slice(end)];
        }
        return args;
    }

    embgen(color = Math.floor(Math.random() * 16777215), content) {
        return new Discord.RichEmbed().setColor(color).setDescription(content);
    }

    parseTimeStrToMilis(timeStr) {
        if(!/([0-9]+[Mdhms]+)+/.test(timeStr)) 
            return -1;
        let timeInc = {"M": 0, "d": 0, "h": 0, "m": 0, "s": 0};
        for(let x of Object.keys(timeInc)) {
            if(timeStr.includes(x)) {
                let temp = timeStr.slice(0, timeStr.indexOf(x)).split("").reverse().join("").trim();
                if(/[A-z]/.test(temp))
                    temp = temp.slice(0, temp.search(/[A-z]/g)).split("").reverse().join("");
                else
                    temp = temp.split("").reverse().join("");
                timeInc[x] += +temp;
            }
        }
        return (timeInc["M"] * 2629743 + timeInc["d"] * 86400 + timeInc["h"] * 3600 + timeInc["m"] * 60 + timeInc["s"]) * 1000;
    }
}

module.exports = Frekwencja;

if(!module.parent) {
    require("dotenv").config();
    new Frekwencja();
}