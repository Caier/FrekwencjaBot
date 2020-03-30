module.exports = {
    name: 'frekwencja',
    description: 'sprawdzanie frekwencji',
    usage: '$pfrekwencja [temat lekcji (opcjonalnie)]',
    notdm: true,
    async execute(msg, args, bot)
    {
        const temat = args.slice(1).join(' ');
        const color = '#1df098';
        const reaction = '✅';
        const cancelreact = '❌';
        const defTime = bot.parseTimeStrToMilis('45m');
        const presMsg = new bot.RichEmbed().setTitle(`Sprawdzanie obecności ${temat ? '('+temat+')' : ''}`).setColor(color)
                        .setDescription(`Aby zaznaczyć swoją obecność kliknij reakcję ${reaction} pod tą wiadomością`)
                        .setFooter(`Wygasa: ${new Date(Date.now() + defTime).toLocaleTimeString([], {timeZone: 'Europe/Warsaw', hour: '2-digit', minute:'2-digit', hour12: false})}`);

        let frekRole = msg.guild.roles.find(v => v.name == 'frekwencja') || [];
        if(frekRole.members.array == 0) {
            msg.channel.send(bot.embgen(bot.sysColor, '**Aby bot działał poprawnie należy dać rolę `frekwencja` wszystkim osobom, których frekwencja ma być sprawdzana.**'));
            return;
        }
        let checkMsg = await msg.channel.send(frekRole.id ? `<@&${frekRole.id}>` : '', {embed: presMsg});
        const checkPres = () => {
            let reacts = checkMsg.reactions.first().users.keyArray().map(v => msg.guild.members.get(v)).filter(v => !v.user.bot);
            let students = msg.guild.members.array().filter(v => v.roles.has(frekRole.id));
            let obecni = students.filter(v => reacts.map(z => z.user.id).includes(v.user.id)).map(v => v.nickname || v.user.username);
            let nieobecni = students.filter(v => !reacts.map(z => z.user.id).includes(v.user.id)).map(v => v.nickname || v.user.username);
            let afterMsg = new bot.RichEmbed().setColor(color).setTitle(`Frekwencja ${temat ? '('+temat+')' : ''}`)
                           .addField('Osoby nieobecne:', nieobecni.join('\n') || 'brak')
                           .addField('Osoby obecne:', obecni.join('\n') || 'brak');
            checkMsg.delete(150);
            msg.channel.send(afterMsg);
        }
        let presTimer = bot.setTimeout(checkPres, defTime);
        await checkMsg.react(reaction);
        await checkMsg.react(cancelreact);
        checkMsg.createReactionCollector((react, user) => react.emoji.name == cancelreact && user.id == msg.author.id)
        .on('collect', () => {
            checkPres();
            clearTimeout(presTimer);
        });
    }
}