const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const fs = require('fs');

// Loader .env sederhana (tanpa dependency) supaya token tidak perlu ditulis di kode / GitHub
if (fs.existsSync('./.env')) {
    for (const line of fs.readFileSync('./.env', 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
        if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
}

const { FISH_DB, ROD_DATA } = require('./data_ikan.js');
const { FISH_PULAU_2 } = require('./data_ikan_pulau2.js');

const CONFIG = {
    token: process.env.DISCORD_TOKEN || "TOKEN_BOT_KAMU_DISINI", 
    prefix: "n",
    adminId: process.env.ADMIN_ID || "ID_DISCORD_KAMU", 
    allowedChannel: process.env.ALLOWED_CHANNEL || "1467551708690387055", 
    isMaintenance: false, 
    adminOnly: false 
};

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// ================= DATA ITEM =================
const CRYSTAL_DATA = [
    { emoji: "<:CrystalGeode:1476282699668000900>", name: "Crystal Geode", chance: 0.3, sellPrice: 55 },
    { emoji: "<:BlueCrystal:1476282701483999303>", name: "Blue Crystal", chance: 0.6, sellPrice: 45 },
    { emoji: "<:GreenCrystal:1476282703522431247>", name: "Green Crystal", chance: 0.9, sellPrice: 35 },
    { emoji: "<:RedCrystal:1476282706827673610>", name: "Red Crystal", chance: 15.0, sellPrice: 20 },
    { emoji: "<:YellowCrystal:1476282709738524765>", name: "Yellow Crystal", chance: 25.0, sellPrice: 10 },
    { emoji: "<:CrystalBananas:1476282711810379897>", name: "Crystal Bananas", chance: 35.0, sellPrice: 5 }
];

const TOTEM_DATA = [
    { id: "T1", emoji: "<:TempestTotem:1476274356488507541>", name: "Tempest Totem", chance: 0.5, price: 250000 },
    { id: "T2", emoji: "<:SmokescreenTotem:1476274524361195640>", name: "Smokescreen Totem", chance: 10.0, price: 100000 },
    { id: "T3", emoji: "<:EclipseTotem:1476274526588371045>", name: "Eclipse Totem", chance: 20.0, price: 70000 },
    { id: "T4", emoji: "<:SundidalTotem:1476274528392056985>", name: "Sundial Totem", chance: 35.0, price: 30000 }
];

const BOAT_DATA = [
    { id: 1, name: "Rowboat", img: "https://fischipedia.org/wiki/Rowboat#/media/File:Rowboat_Render.png", price: 5000000, cooldown: 25 },
    { id: 2, name: "Speedboat", img: "https://fischipedia.org/wiki/Speedboat#/media/File:Speedboat_Render.png", price: 10000000, cooldown: 10 },
    { id: 3, name: "Cursed Rider", img: "https://fischipedia.org/wiki/Cursed_Rider#/media/File:Cursed_Rider_Render.png", price: 25000000, cooldown: 2 },
    { id: 4, name: "Airboat", img: "https://fischipedia.org/wiki/Airboat#/media/File:Airboat_Render.png", price: 50000000, cooldown: 0 }
];

const LUMINESCENT_IMG = "https://fischipedia.org/wiki/Luminescent_Cavern#/media/File:Luminescent_Cavern.png";

const DB_FILE = './database.json';
let NAKOS_DB = {};
if (fs.existsSync(DB_FILE)) NAKOS_DB = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const saveDB = () => fs.writeFileSync(DB_FILE, JSON.stringify(NAKOS_DB, null, 2));

if (!NAKOS_DB['SYSTEM']) { NAKOS_DB['SYSTEM'] = { huntEvent: false, eventName: "" }; saveDB(); }

// ================= CORE FUNCTIONS =================
const formatRp = (angka) => `Rp ${new Intl.NumberFormat('id-ID').format(angka)}`;
const formatUsd = (angka) => `$${new Intl.NumberFormat('en-US').format(angka)}`;
const getRealTimeRate = async () => { try { const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD'); const data = await res.json(); return Math.floor(data.rates.IDR); } catch { return 15000; } };

const getFishData = (tier) => {
    if (tier === "Common") return { xp: 15, price: Math.floor(Math.random() * 4000) + 1000 };
    if (tier === "Rare") return { xp: 40, price: Math.floor(Math.random() * 35000) + 15000 };
    if (tier === "Legendary") return { xp: 100, price: Math.floor(Math.random() * 90000) + 60000 };
    if (tier === "Mythic") return { xp: 250, price: Math.floor(Math.random() * 300000) + 200000 };
    if (tier === "Secret") return { xp: 1000, price: Math.floor(Math.random() * 4000000) + 1000000 };
    
    if (tier === "Extinct") return { xp: 2500, price: Math.floor(Math.random() * 20000) + 5000 };
    if (tier === "Limited") return { xp: 5000, price: Math.floor(Math.random() * 29000) + 26000 };
    if (tier === "Apex") return { xp: 10000, price: Math.floor(Math.random() * 30000) + 60000 };
    if (tier === "Special") return { xp: 25000, price: Math.floor(Math.random() * 50000) + 100000 };
    
    if (tier.includes("Hunt")) return { xp: 5000, price: Math.floor(Math.random() * 15000000) + 10000000 };
    return { xp: 5, price: 1000 };
};

// [REVISI V1] Helper function untuk ngecek target XP sesuai lokasi
const getTargetXp = (level, location) => {
    return location === "Luminescent" ? Math.floor(level * 750 * 2.5) : level * 750;
};

const checkLevelUp = (userObj, message) => {
    let targetXp = getTargetXp(userObj.level, userObj.location); 
    while (userObj.xp >= targetXp) {
        userObj.xp -= targetXp;
        userObj.level += 1;
        let reward = Math.floor(Math.random() * 80001); // Random 0 sampai 80.000
        let lootboxReward = 1; // [REVISI V1] Hadiah lootbox di set paten 1 per level up
        userObj.wallet += reward;
        userObj.lootboxes += lootboxReward;
        targetXp = getTargetXp(userObj.level, userObj.location);
        
        // Kirim DM biar nggak spam
        message.author.send(`🎉 **LEVEL UP!** <@${message.author.id}> telah mencapai **Level ${userObj.level}**!\n🎁 **Hadiah:** \`${formatRp(reward)}\` & \`${lootboxReward}x Lootbox\``)
            .catch(() => console.log('Gagal DM User untuk Level Up (DM dikunci)'));
    }
};

client.on('clientReady', () => console.log(`🚀 NAKOS 24/7 THE ULTIMATE BUILD READY!`));

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(CONFIG.prefix)) return;
    const user = message.author;
    
    if (CONFIG.allowedChannel && message.channel.id !== CONFIG.allowedChannel && user.id !== CONFIG.adminId) return;
    if (user.id !== CONFIG.adminId) {
        if (CONFIG.isMaintenance) return message.reply("Bentar, maintenance dulu y");
        if (CONFIG.adminOnly) return;
    }

    const args = message.content.slice(CONFIG.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const serverName = message.member ? message.member.displayName : user.username;

    // Database Init
    if (!NAKOS_DB[user.id]) {
        NAKOS_DB[user.id] = { wallet: 0, bank: 0, usd: 0, card: "2443", xp: 0, level: 1, streak: 0, lastClaimed: 0, isFirstTime: true, lootboxes: 0, activeRod: 1, spent: 0, ownedRods: [1], fishes: {}, crystals: {}, items: {}, totems: {}, location: "Pulau 1", travelingTo: null, arrivalTime: 0, ownedBoats: [], activeBoat: 0 };
        saveDB();
    }
    const userData = NAKOS_DB[user.id];
    
    // Failsafes untuk yang udah ada
    if (!userData.fishes) userData.fishes = {}; if (!userData.crystals) userData.crystals = {}; if (!userData.totems) userData.totems = {};
    if (!userData.ownedBoats) { userData.ownedBoats = []; userData.activeBoat = 0; userData.location = "Pulau 1"; userData.travelingTo = null; userData.arrivalTime = 0; }
    if (!userData.level) { userData.level = 1; userData.xp = 0; }
    
    for (const fName in userData.fishes) {
        if (!userData.fishes[fName].id) userData.fishes[fName].id = Math.floor(Math.random() * 90000) + 10000;
        if (userData.fishes[fName].favorite === undefined) userData.fishes[fName].favorite = false;
    }

    // Auto-Arrival System
    if (userData.travelingTo && Date.now() >= userData.arrivalTime) {
        userData.location = userData.travelingTo;
        userData.travelingTo = null;
        userData.arrivalTime = 0;
        saveDB();
    }

    // ================= 1. PROFIL, HELP & TOP =================
    if (command === 'profile') {
        let targetXp = getTargetXp(userData.level, userData.location); 
        let boatName = userData.activeBoat === 0 ? "Tidak Ada" : BOAT_DATA.find(b => b.id === userData.activeBoat).name;
        let rodName = ROD_DATA.find(r => r.id === userData.activeRod).name;
        let progress = Math.min(10, Math.floor((userData.xp / targetXp) * 10));
        let bar = "🟩".repeat(progress) + "⬛".repeat(10 - progress);

        const embed = new EmbedBuilder().setTitle(`👤 PROFIL: ${serverName}`).setThumbnail(user.displayAvatarURL({ dynamic: true })).setColor('#3498db')
            .addFields(
                { name: "🏆 Level & XP", value: `**Level ${userData.level}**\n${bar}\nXP: \`${userData.xp} / ${targetXp}\``, inline: false },
                { name: "💵 Keuangan", value: `Wallet: \`${formatRp(userData.wallet)}\`\nBank: \`${formatRp(userData.bank)}\`\nUSD: \`${formatUsd(userData.usd)}\``, inline: false },
                { name: "📍 Lokasi Saat Ini", value: `\`${userData.travelingTo ? 'OTW ke ' + userData.travelingTo : userData.location}\``, inline: true },
                { name: "🎣 Equipment", value: `Rod: \`${rodName}\`\nBoat: \`${boatName}\``, inline: true }
            );
        return message.reply({ embeds: [embed] });
    }

    if (command === 'caramain') {
        let guide = `**📖 PANDUAN NAKOS 24/7 DARI NOL SAMPAI PRO**\n\n` +
        `**1️⃣ Fase Awal (Mancing Mania)**\n` +
        `Mulai mancing dengan \`ncatch\` pakai Starter Rod. Ikan masuk ke \`ninv\`. Jual ikannya pakai \`nsell all\` buat dapet modal Rupiah (IDR).\n\n` +
        `**2️⃣ Upgrade Gear (Toko Rod)**\n` +
        `Cek \`nshop\` dan beli pancingan baru pakai \`nbuy [ID]\`. Ingat, **beli harus berurutan**! Cek dan pakai rod yang lu punya di \`nrod\`.\n\n` +
        `**3️⃣ Simpan Uang & Trading**\n` +
        `Nabung di bank pakai \`ndep all\`. Gunakan \`nrate\` untuk cek harga USD. Jual/Beli USD pakai \`nbuyusd\` dan \`nsellusd\`.\n\n` +
        `**4️⃣ Pergi ke Luminescent (Pulau 2)**\n` +
        `Beli kapal di \`nboat\`, equip, lalu ketik \`nmovelocation\`. Siapkan pancingan elit (Minimal Rod 10) buat mancing di sana!`;
        return message.reply({ embeds: [new EmbedBuilder().setTitle("🎮 CARA MAIN NAKOS 24/7").setColor('#2ecc71').setDescription(guide)] });
    }

    // [REVISI] Mengembalikan Prefix nhelp dengan Button Kategori
    if (command === 'help') {
        const createHelpEmbed = (category) => {
            let title = "🤖 NAKOS 24/7 COMMANDS";
            let color = '#2ecc71';
            let desc = "";

            if (category === 'eco') {
                desc = "**KATEGORI: ECO**\n──────────────────────────────\n" +
                    "`nprofile` - Cek Profil & XP\n" +
                    "`nbank` - Cek Saldo\n" +
                    "`nrate` - Cek Kurs USD\n" +
                    "`ntod` - Leaderboard\n" +
                    "`ndep` / `nwd` - Nabung / Tarik Bank\n" +
                    "`nbuyusd` / `nsellusd` - Trading USD\n" +
                    "`ntf @user jumlah idr/usd` - Transfer\n" +
                    "`ndaily` - Bonus Harian\n" +
                    "`nopl` - Buka Lootbox";
            } else if (category === 'fish') {
                desc = "**KATEGORI: FISH**\n──────────────────────────────\n" +
                    "`ncatch` - Memancing ikan\n" +
                    "`ninv` - Cek Tas Ikan\n" +
                    "`nfavorite [ID]` - Lock ikan\n" +
                    "`ngivefish @user [ID] [Jml]` - Beri Ikan\n" +
                    "`nsell [all/Tier/ID]` - Jual Ikan\n" +
                    "`nsc [all/nama]` - Jual Crystal\n" +
                    "`nshop` - Toko Pancingan\n" +
                    "`nrod` - Ransel Pancingan\n" +
                    "`nlistrod` - List Rod\n" +
                    "`nbuy [ID]` - Beli Rod/Totem\n" +
                    "`nboat` - Beli/Pilih Kapal\n" +
                    "`nmovelocation` - Pergi ke Pulau Lain\n" +
                    "`nlistfish` - Daftar Ikan\n" +
                    "`nfish [Nama]` - Detail Ikan";
            }

            return new EmbedBuilder()
                .setTitle(title)
                .setColor(color)
                .setDescription(desc);
        };

        const getHelpBtns = (activeCategory) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('help_eco')
                    .setLabel('Ekonomi & Profil')
                    .setEmoji('💳')
                    .setStyle(activeCategory === 'eco' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('help_fish')
                    .setLabel('Mancing & Travel')
                    .setEmoji('🎣')
                    .setStyle(activeCategory === 'fish' ? ButtonStyle.Success : ButtonStyle.Secondary)
            );
        };

        let currentCategory = 'eco';
        const msg = await message.reply({ embeds: [createHelpEmbed(currentCategory)], components: [getHelpBtns(currentCategory)] });
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

        collector.on('collect', async i => {
            if (i.user.id !== user.id) return i.reply({ content: "Gunakan command sendiri!", ephemeral: true });
            if (i.customId === 'help_eco') currentCategory = 'eco';
            if (i.customId === 'help_fish') currentCategory = 'fish';
            
            await i.update({ embeds: [createHelpEmbed(currentCategory)], components: [getHelpBtns(currentCategory)] });
        });
        return;
    }

    // [REVISI] Mengembalikan Prefix nlistrod dengan Button Pagination
    if (command === 'listrod') {
        let page = 0;
        const totalPages = ROD_DATA.length;

        const createEmbed = (p) => {
            const rod = ROD_DATA[p];
            return new EmbedBuilder()
                .setTitle("🎣 Fishing Rod Gallery")
                .setColor('#2ecc71')
                .addFields(
                    { name: "📋 Nama Rod", value: `${rod.name}`, inline: false },
                    { name: "🆔 ID Rod", value: `#${rod.id}`, inline: false },
                    { name: "📈 Luck State", value: `${rod.luckLabel || "5%"}`, inline: false } 
                )
                .setImage(rod.img || null)
                .setFooter({ text: `Halaman ${p + 1} dari ${totalPages}` });
        };

        const getBtns = (p) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_rod')
                    .setLabel('◀ Back')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(p === 0),
                new ButtonBuilder()
                    .setCustomId('next_rod')
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(p === totalPages - 1)
            );
        };

        const msg = await message.reply({ embeds: [createEmbed(page)], components: [getBtns(page)] });
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

        collector.on('collect', async i => {
            if (i.user.id !== user.id) return i.reply({ content: "Gunakan command sendiri!", ephemeral: true });
            if (i.customId === 'next_rod') page++;
            if (i.customId === 'prev_rod') page--;
            await i.update({ embeds: [createEmbed(page)], components: [getBtns(page)] });
        });
        return;
    }

    // [REVISI] Mengembalikan Prefix ntod (Leaderboard Top Player)
    if (command === 'tod' || command === 'leaderboard') {
        const users = Object.keys(NAKOS_DB).filter(id => id !== 'SYSTEM');
        
        const sortedUsers = users.map(id => ({
            id,
            level: NAKOS_DB[id].level || 1,
            xp: NAKOS_DB[id].xp || 0
        })).sort((a, b) => b.level - a.level || b.xp - a.xp).slice(0, 10);

        if (sortedUsers.length === 0) return message.reply("Belum ada data pemain.");

        let desc = "Peringkat pemancing terbaik berdasarkan Level & XP!\n──────────────────────────────\n";
        sortedUsers.forEach((u, i) => {
            let rankLabel = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**#${i + 1}**`;
            desc += `${rankLabel} <@${u.id}> ─ **Level ${u.level}** (${u.xp} XP)\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle("🏆 LEADERBOARD NAKOS 24/7")
            .setColor('#f1c40f')
            .setDescription(desc)
            .setFooter({ text: "Terus mancing dan jadilah yang terbaik!" });

        return message.reply({ embeds: [embed] });
    }

    // ================= 2. EKONOMI =================
    if (command === 'rate') return message.reply(`📈 **KURS REAL-TIME HARI INI**\n💵 1 USD = **${formatRp(await getRealTimeRate())}**`);

    if (command === 'bank') {
        const embed = new EmbedBuilder().setAuthor({ name: '💳 777 Bank - Credit Card', iconURL: user.displayAvatarURL() }).setColor('#2b2d31').setDescription(`👤 **Nama Nasabah**\n${serverName}\n\n🔢 **Nomor Kartu**\n${userData.card}\n\n⏳ **Valid Thru**\n99/99\n\n💵 **Wallet**\n${formatRp(userData.wallet)}\n\n🏦 **Bank**\n${formatRp(userData.bank)}\n\n💲 **USD**\n${formatUsd(userData.usd)}`);
        return message.reply({ embeds: [embed] });
    }

    if (command === 'dep') {
        let arg = args[0];
        if (!arg) return message.reply("Masukan jumlah nominalnya, contoh `ndep 50000` atau `ndep all`");
        let amt = arg.toLowerCase() === 'all' ? userData.wallet : parseInt(arg);
        if (isNaN(amt) || amt <= 0) return message.reply("Format salah.");
        if (userData.wallet < amt) return message.reply("❌ Uang di dompet lu kurang!");
        userData.wallet -= amt; userData.bank += amt; saveDB();
        return message.reply(`✅ Berhasil masuk ke rekening Bank **${formatRp(amt)}**\n💵 Sisa saldo di wallet: **${formatRp(userData.wallet)}**`);
    }

    if (command === 'wd') {
        let arg = args[0];
        if (!arg) return message.reply("Masukan jumlah nominalnya, contoh `nwd 50000` atau `nwd all`");
        let amt = arg.toLowerCase() === 'all' ? userData.bank : parseInt(arg);
        if (isNaN(amt) || amt <= 0) return message.reply("Format salah.");
        if (userData.bank < amt) return message.reply("❌ Saldo bank lu kurang!");
        userData.bank -= amt; userData.wallet += amt; saveDB();
        return message.reply(`✅ Berhasil menarik saldo dari rekening Bank **${formatRp(amt)}**\n🏦 Sisa saldo bank: **${formatRp(userData.bank)}**`);
    }

    if (command === 'buyusd' || command === 'sellusd') {
        let amt = parseInt(args[0]);
        if (isNaN(amt) || amt <= 0) return message.reply("❌ Masukkan jumlah USD! Contoh: `nbuyusd 10`");
        await message.channel.sendTyping();
        const rate = await getRealTimeRate(); const totalCost = amt * rate;
        if (command === 'buyusd') {
            if (userData.bank < totalCost) return message.reply(`❌ Saldo Bank kurang! Butuh **${formatRp(totalCost)}**`);
            userData.bank -= totalCost; userData.usd += amt; saveDB();
            return message.reply(`✅ Berhasil membeli USD **${formatUsd(amt)}**\n🏦 Sisa saldo IDR (Bank): **${formatRp(userData.bank)}**\n📊 Silahkan cek kurs saat ini di \`nrate\``);
        } else {
            if (userData.usd < amt) return message.reply("❌ USD lu kurang!");
            userData.usd -= amt; userData.bank += totalCost; saveDB();
            return message.reply(`✅ Berhasil menjual USD menjadi **${formatRp(totalCost)}**\n💵 Sisa saldo USD: **${formatUsd(userData.usd)}**\n📊 Silahkan cek kurs saat ini di \`nrate\``);
        }
    }

    // [REVISI] Mengembalikan Prefix ntf dengan opsi IDR / USD
    if (command === 'tf' || command === 'transfer') {
        const targetUser = message.mentions.users.first();
        let amount = parseInt(args[1]);
        let currency = args[2] ? args[2].toLowerCase() : null;

        if (!targetUser || targetUser.bot || targetUser.id === user.id) return message.reply("❌ Format: `ntf @user [jumlah] [idr/usd]`\nContoh: `ntf @Nakos 5000 idr`");
        if (isNaN(amount) || amount <= 0) return message.reply("❌ Masukkan jumlah yang valid!");
        if (!currency || (currency !== 'idr' && currency !== 'usd')) return message.reply("❌ Tentukan mata uangnya! Pilih `idr` atau `usd`.");

        if (!NAKOS_DB[targetUser.id]) {
            NAKOS_DB[targetUser.id] = { wallet: 0, bank: 0, usd: 0, card: "2443", xp: 0, level: 1, streak: 0, lastClaimed: 0, isFirstTime: true, lootboxes: 0, activeRod: 1, spent: 0, ownedRods: [1], fishes: {}, crystals: {}, items: {}, totems: {}, location: "Pulau 1", travelingTo: null, arrivalTime: 0, ownedBoats: [], activeBoat: 0 };
        }
        
        if (currency === 'idr') {
            if (userData.wallet < amount) return message.reply("❌ Saldo IDR (Wallet) kamu tidak mencukupi!");
            userData.wallet -= amount;
            NAKOS_DB[targetUser.id].wallet += amount;
        } else if (currency === 'usd') {
            if (userData.usd < amount) return message.reply("❌ Saldo USD kamu tidak mencukupi!");
            userData.usd -= amount;
            NAKOS_DB[targetUser.id].usd += amount;
        }

        saveDB();

        const currSymbol = currency === 'idr' ? formatRp(amount) : formatUsd(amount);
        const embed = new EmbedBuilder()
            .setTitle("💸 Transfer Berhasil")
            .setDescription(`<@${user.id}> berhasil mengirimkan **${currSymbol}** kepada <@${targetUser.id}>.`)
            .setColor('#2ecc71');
        return message.reply({ embeds: [embed] });
    }

    // ================= 3. KAPAL & TRAVEL =================
    if (command === 'boat') {
        let page = 0;
        let list = BOAT_DATA;
        const createEmbed = (p) => {
            const b = list[p];
            const isOwned = userData.ownedBoats.includes(b.id);
            const isEquipped = userData.activeBoat === b.id;
            return new EmbedBuilder().setTitle("🚤 BOAT SHOWROOM").setColor(isEquipped ? '#f1c40f' : '#3498db')
                .addFields(
                    { name: "📋 Nama Kapal", value: `${isEquipped ? "⭐ " : ""}\`${b.name}\``, inline: true }, 
                    { name: "💰 Harga", value: `\`${b.price === 0 ? "Gratis" : formatRp(b.price)}\``, inline: true }, 
                    { name: "⏳ Waktu Perjalanan", value: `\`${b.cooldown} Menit\``, inline: true }
                ).setImage(b.img).setFooter({ text: `Kapal ${p + 1} dari ${list.length} | Status: ${isOwned ? (isEquipped ? 'Dipakai (Equipped)' : 'Disimpan') : 'Belum Dibeli'}` });
        };

        const getBtns = (p) => {
            const b = list[p];
            const isOwned = userData.ownedBoats.includes(b.id);
            const isEquipped = userData.activeBoat === b.id;
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('back').setLabel('◀').setStyle(ButtonStyle.Primary).setDisabled(p === 0),
                new ButtonBuilder().setCustomId('equip').setLabel('Equip').setStyle(ButtonStyle.Success).setDisabled(!isOwned || isEquipped),
                new ButtonBuilder().setCustomId('buy').setLabel('Buy').setStyle(ButtonStyle.Danger).setDisabled(isOwned),
                new ButtonBuilder().setCustomId('next').setLabel('▶').setStyle(ButtonStyle.Primary).setDisabled(p === list.length - 1)
            );
        };

        const msg = await message.reply({ embeds: [createEmbed(page)], components: [getBtns(page)] });
        const coll = msg.createMessageComponentCollector({ time: 120000 });
        coll.on('collect', async i => {
            if (i.user.id !== user.id) return i.reply({ content: "Gunakan command sendiri!", ephemeral: true });
            if (i.customId === 'next') page++; 
            else if (i.customId === 'back') page--;
            else if (i.customId === 'equip') {
                userData.activeBoat = list[page].id; saveDB();
            }
            else if (i.customId === 'buy') {
                let b = list[page];
                if (userData.wallet < b.price) return i.reply({ content: "❌ Uang di dompet kurang!", ephemeral: true });
                userData.wallet -= b.price; userData.ownedBoats.push(b.id); userData.activeBoat = b.id; saveDB();
                message.channel.send(`✅ **${serverName}** berhasil membeli kapal **${b.name}**!`);
            }
            await i.update({ embeds: [createEmbed(page)], components: [getBtns(page)] });
        });
        return;
    }

    if (command === 'movelocation') {
        if (userData.activeBoat === 0) return message.reply("❌ Kamu belum membeli/memakai perahu apapun! Beli di `nboat` dulu.");
        if (userData.travelingTo) {
            let sisa = Math.ceil((userData.arrivalTime - Date.now()) / 60000);
            return message.reply(`❌ Lu masih OTW ke **${userData.travelingTo}**! Sisa waktu: **${sisa} menit**.`);
        }
        
        let targetPulau = userData.location === "Pulau 1" ? "Luminescent" : "Pulau 1";
        let boat = BOAT_DATA.find(b => b.id === userData.activeBoat);
        
        if (boat.cooldown === 0) {
            userData.location = targetPulau; saveDB();
            let img = targetPulau === "Luminescent" ? LUMINESCENT_IMG : null;
            const arrEmbed = new EmbedBuilder().setColor('#2ecc71').setDescription(`🏝️ <@${user.id}> sudah sampai di pulau **${targetPulau}**, selamat memancing!`);
            if(img) arrEmbed.setImage(img);
            
            // Langsung DM ke user karena cooldown 0
            user.send({ content: `<@${user.id}>`, embeds: [arrEmbed] }).catch(() => message.channel.send(`<@${user.id}> DM dikunci, tapi kamu udah sampai di **${targetPulau}**!`));
            return message.reply(`🚤 **INSTANT TRAVEL** digunakan! Cek DM kamu.`);
        } else {
            userData.travelingTo = targetPulau;
            userData.arrivalTime = Date.now() + (boat.cooldown * 60000);
            saveDB();
            const embed = new EmbedBuilder().setColor('#f1c40f').setDescription(`Sedang dalam perjalanan menuju ${targetPulau} island. Waktu tempuh: ${boat.cooldown} menit lagi akan sampai`).setImage(boat.img);
            message.reply({ embeds: [embed] });

            setTimeout(() => {
                if(NAKOS_DB[user.id].travelingTo === targetPulau) {
                    NAKOS_DB[user.id].location = targetPulau; NAKOS_DB[user.id].travelingTo = null; saveDB();
                    let img = targetPulau === "Luminescent" ? LUMINESCENT_IMG : null;
                    const arrEmbed = new EmbedBuilder().setColor('#2ecc71').setDescription(`🏝️ <@${user.id}> sudah sampai di pulau **${targetPulau}**, selamat memancing!`);
                    if(img) arrEmbed.setImage(img);
                    
                    // Notif DM pas nyampe
                    user.send({ content: `<@${user.id}>`, embeds: [arrEmbed] }).catch(() => console.log('Gagal DM user pas nyampe pulau'));
                }
            }, boat.cooldown * 60000);
            return;
        }
    }

    // ================= 4. FISHING CORE (RNG v1) =================
    if (command === 'catch') {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('start_fishing').setLabel('🎣 Mancing').setStyle(ButtonStyle.Success));
        let locText = userData.travelingTo ? `(Lagi OTW ke ${userData.travelingTo}, mancing di sekitar Pulau 1)` : `(${userData.location})`;
        const msg = await message.reply({ embeds: [new EmbedBuilder().setTitle(`🎣 AREA MEMANCING ${locText}`).setColor('#3498db').setDescription(`Halo **${serverName}**!\nSiapkan pancinganmu dan tekan tombol **Mancing**.` )], components: [row] });
        const coll = msg.createMessageComponentCollector({ time: 120000 });

        coll.on('collect', async (i) => {
            if (i.user.id !== user.id) return i.reply({ content: "Pancingan orang lain!", ephemeral: true });
            
            if (userData.travelingTo && Date.now() >= userData.arrivalTime) {
                userData.location = userData.travelingTo; userData.travelingTo = null; saveDB();
            }

            await i.update({ embeds: [new EmbedBuilder().setTitle("🌊 SEDANG MEMANCING...").setColor('#f1c40f').setDescription("Menunggu ikan menyambar kail...")], components: [] });
            await new Promise(r => setTimeout(r, 4500));
            
            let rodId = userData.activeRod;
            const rodData = ROD_DATA.find(r => r.id === rodId) || ROD_DATA[0];
            let isHuntActive = NAKOS_DB['SYSTEM'].huntEvent;
            let caughtFishes = {}, totalXpEarned = 0;
            let catchTxt = `Kerja bagus! Kailmu berhasil ditarik.\n\n**🐟 Hasil Tangkapan (5 Ikan):**\n──────────────────────────────\n`;

            let currentLoc = userData.travelingTo ? "Pulau 1" : userData.location;

            for (let j=0; j<5; j++) {
                let rng = Math.random();
                let tier = "Common";
                
                let huntChance = 0;
                if (isHuntActive) {
                    if (rodId >= 19) huntChance = 0.015; else if (rodId >= 16) huntChance = 0.008; else if (rodId >= 10) huntChance = 0.005;
                }
                
                if (huntChance > 0 && Math.random() < huntChance) {
                    tier = Math.random() > 0.5 ? "Megalodon Hunt" : "Kraken Hunt";
                } 
                else if (currentLoc === "Luminescent") {
                    if (rodId >= 21) { if (rng < 0.03) tier = "Special"; else if (rng < 0.28) tier = "Apex"; else tier = "Limited"; } 
                    else if (rodId >= 16) { if (rng < 0.015) tier = "Special"; else if (rng < 0.115) tier = "Apex"; else if (rng < 0.515) tier = "Limited"; else tier = "Extinct"; } 
                    else if (rodId >= 10) { if (rng < 0.005) tier = "Special"; else if (rng < 0.035) tier = "Apex"; else if (rng < 0.235) tier = "Limited"; else tier = "Extinct"; } 
                    else { tier = "Zonk"; }
                } 
                else {
                    if (rodId >= 19) { if (rng < 0.15) tier = "Secret"; else if (rng < 0.45) tier = "Mythic"; else if (rng < 0.85) tier = "Legendary"; else tier = "Rare"; } 
                    else if (rodId >= 16) { if (rng < 0.06) tier = "Secret"; else if (rng < 0.28) tier = "Mythic"; else if (rng < 0.63) tier = "Legendary"; else tier = "Rare"; } 
                    else if (rodId >= 13) { if (rng < 0.03) tier = "Secret"; else if (rng < 0.18) tier = "Mythic"; else if (rng < 0.48) tier = "Legendary"; else tier = "Rare"; } 
                    else if (rodId >= 9) { if (rng < 0.01) tier = "Secret"; else if (rng < 0.11) tier = "Mythic"; else if (rng < 0.36) tier = "Legendary"; else if (rng < 0.81) tier = "Rare"; else tier = "Common"; } 
                    else if (rodId >= 4) { if (rng < 0.02) tier = "Mythic"; else if (rng < 0.17) tier = "Legendary"; else if (rng < 0.67) tier = "Rare"; else tier = "Common"; } 
                    else { if (rng < 0.05) tier = "Legendary"; else if (rng < 0.40) tier = "Rare"; else tier = "Common"; }
                }

                if (tier === "Zonk") continue;

                let activeDB = currentLoc === "Luminescent" ? FISH_PULAU_2 : FISH_DB;
                if (tier.includes("Hunt")) activeDB = FISH_DB; 
                let validFishes = activeDB.filter(f => f.tier === tier);
                if (validFishes.length === 0 && currentLoc === "Pulau 1") validFishes = FISH_DB.filter(f=>f.tier==="Common"); 
                
                if (validFishes.length > 0) {
                    let fish = validFishes[Math.floor(Math.random() * validFishes.length)];
                    if (!userData.fishes[fish.name]) userData.fishes[fish.name] = { rarity: fish.tier, count: 0, id: Math.floor(Math.random() * 90000) + 10000, favorite: false };
                    userData.fishes[fish.name].count++; 
                    if (!caughtFishes[fish.name]) caughtFishes[fish.name] = { count: 0, rarity: fish.tier };
                    caughtFishes[fish.name].count++;
                    totalXpEarned += getFishData(fish.tier).xp;
                }
            }

            if (Object.keys(caughtFishes).length === 0) {
                catchTxt += "*ZONK! Pancinganmu terlalu lemah untuk ikan di Luminescent (Minimal Rod 10!).*\n";
            } else {
                for (let k in caughtFishes) {
                    let c = caughtFishes[k];
                    catchTxt += `**${k}** | \`${c.rarity}\` | x${c.count}\n`;
                }
            }

            userData.xp += totalXpEarned;
            saveDB();
            checkLevelUp(userData, message);
            saveDB();
            
            i.editReply({ embeds: [new EmbedBuilder().setTitle("✨ TANGKAPAN BERHASIL ✨").setColor('#2ecc71').setDescription(catchTxt).setFooter({text:`Nama pancingan yg sedang digunakan sekarang: ${rodData.name}\nninv untuk membuka tas\nnfish untuk melihat visual ikan\nnrod untuk melihat pancinganmu`})], components: [row] });
            coll.resetTimer();
        }); return;
    }

    // ================= 5. NLISTFISH & NFISH =================
    if (command === 'listfish') {
        const TIER_OPTIONS = [
            { label: 'Common (Pulau 1)', value: 'Common_1', emoji: '🐟' }, { label: 'Rare (Pulau 1)', value: 'Rare_1', emoji: '🐠' },
            { label: 'Legendary (P1)', value: 'Legendary_1', emoji: '🏅' }, { label: 'Mythic (P1)', value: 'Mythic_1', emoji: '🔮' },
            { label: 'Secret (P1)', value: 'Secret_1', emoji: '👑' }, { label: 'Extinct (Pulau 2)', value: 'Extinct_1', emoji: '🦴' },
            { label: 'Limited (Pulau 2)', value: 'Limited_1', emoji: '⏳' }, { label: 'Apex (Pulau 2)', value: 'Apex_1', emoji: '🦈' },
            { label: 'Special (Pulau 2)', value: 'Special_1', emoji: '✨' }, { label: 'Hunt Event', value: 'Hunt_1', emoji: '⚔️' }
        ];

        const createTierEmbed = (tierSelection) => {
            let [tierValue, part] = tierSelection.split('_'); 
            let combinedDB = [...FISH_DB, ...FISH_PULAU_2];
            let fishInTier = tierValue === 'Hunt' ? combinedDB.filter(f => f.tier.includes('Hunt')) : combinedDB.filter(f => f.tier === tierValue);
            
            let startIdx = 0, endIdx = Math.min(40, fishInTier.length);
            const displayFishes = fishInTier.slice(startIdx, endIdx);

            let listText = "Gunakan `nfish [Nama Ikan]` untuk melihat detail & gambar!\n──────────────────────────────\n\n";
            if (displayFishes.length === 0) listText += "*Tidak ada ikan di halaman ini.*";
            else { displayFishes.forEach((fish, idx) => { listText += `**[No. ${idx + 1}] ${fish.name}**\n🏆 Rarity: \`${fish.tier}\`\n🔎 Command: \`nfish ${fish.name.toLowerCase()}\`\n\n`; }); }

            return new EmbedBuilder().setTitle(`FISH DATABASE`).setColor('#3498db').setDescription(listText).setFooter({ text: "Gunakan menu di bawah untuk pindah Tier" });
        };

        const msg = await message.reply({ embeds: [createTierEmbed('Common_1')], components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('tier_filter').setPlaceholder('Filter Tier Ikan...').addOptions(TIER_OPTIONS.map(opt => new StringSelectMenuOptionBuilder().setLabel(opt.label).setValue(opt.value).setEmoji(opt.emoji))))] });
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 120000 });
        collector.on('collect', async (i) => { if (i.user.id !== user.id) return; await i.update({ embeds: [createTierEmbed(i.values[0])] }); });
        return;
    }

    if (command === 'fish') {
        const query = args.join(" ").toLowerCase();
        if (!query) return message.reply("❌ Masukin nama ikannya! Contoh: `nfish Anchovy`");
        let combinedDB = [...FISH_DB, ...FISH_PULAU_2];
        const fish = combinedDB.find(f => f.name.toLowerCase() === query);
        if (!fish) return message.reply(`❌ Ikan **${query}** nggak ketemu di database!`);

        const embed = new EmbedBuilder().setTitle(`DETAIL IKAN`).setColor('#f1c40f')
            .setDescription(`**Nama Ikan:** ${fish.name}\n🏆 **Rarity:** \`${fish.tier}\`\n🖼️ **Status Gambar:** \`${fish.img ? "Tersedia" : "Belum ada"}\``)
            .setImage(fish.img || null).setFooter({ text: "777 Fishing System • Fish Database" });
        return message.reply({ embeds: [embed] });
    }

    // ================= 6. INVENTORY & SELL =================
    if (command === 'inv' || command === 'inventory') {
        const invOptions = [ { label: 'Tas Ikan', value: 'inv_fish', emoji: '🐟' }, { label: 'Crystal', value: 'inv_crystal', emoji: '🔮' }, { label: 'Totem', value: 'inv_totem', emoji: '🗿' }, { label: 'Barang', value: 'inv_item', emoji: '📦' } ];
        const generateInv = (cat) => {
            let desc = "";
            if (cat === 'inv_fish') { desc = "**🐟 KOLEKSI IKAN**\n──────────────────────────────\n"; let keys = Object.keys(userData.fishes); if (keys.length === 0) desc += "*Tas ikan kosong*"; else keys.forEach(k => { let v = userData.fishes[k]; desc += `${v.favorite?"⭐ ":""}[ID: ${v.id}] **${k}** | \`${v.rarity}\` | ${v.count}x\n`; }); }
            else if (cat === 'inv_crystal') { desc = "**🔮 KOLEKSI CRYSTAL**\n──────────────────────────────\n"; let keys = Object.keys(userData.crystals); if (keys.length === 0) desc += "*Tas crystal kosong*"; else keys.forEach(k => { const c = CRYSTAL_DATA.find(x => x.name === k); if(c) desc += `${c.emoji} **${k}** | Jumlah: \`${userData.crystals[k]}x\`\n`; }); }
            else if (cat === 'inv_totem') { desc = "**🗿 KOLEKSI TOTEM**\n──────────────────────────────\n"; let keys = Object.keys(userData.totems); if (keys.length === 0) desc += "*Tas totem kosong*"; else keys.forEach(k => { const t = TOTEM_DATA.find(x => x.name === k); if(t) desc += `${t.emoji} **${k}** | Jumlah: \`${userData.totems[k]}x\`\n`; }); }
            else if (cat === 'inv_item') { desc = "**📦 BARANG & ITEM**\n──────────────────────────────\n📦 **Lootbox**: "+userData.lootboxes+"x\n🎣 **Active Rod**: ID #"+userData.activeRod+"\n🚤 **Active Boat**: ID #"+userData.activeBoat; }
            return new EmbedBuilder().setTitle(`🎒 INVENTORY RANSEL`).setColor('#F1C40F').setDescription(desc).setFooter({ text: "Gunakan nfavorite untuk mengunci ikan\nnfish untuk melihat visual ikan\nnsell untuk menjual ikan\nnrod untuk memilih pancingan\nnsc untuk menjual crystal" });
        };
        const msg = await message.reply({ embeds: [generateInv('inv_fish')], components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('inv_filter').setPlaceholder('Pilih Kategori Tas...').addOptions(invOptions.map(opt => new StringSelectMenuOptionBuilder().setLabel(opt.label).setValue(opt.value).setEmoji(opt.emoji))))] });
        const coll = msg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 120000 });
        coll.on('collect', async (i) => { if (i.user.id !== user.id) return; await i.update({ embeds: [generateInv(i.values[0])] }); }); return;
    }

    if (command === 'favorite' || command === 'fav') {
        let targetId = parseInt(args[0]);
        if (isNaN(targetId)) return message.reply("❌ Format: `nfavorite [ID]` (Cek ID di `ninv`)");
        let found = null, fName = "";
        for (const [name, data] of Object.entries(userData.fishes)) { if (data.id === targetId) { found = data; fName = name; break; } }
        if (!found) return message.reply("❌ Ikan dengan ID tersebut tidak ditemukan di tasmu!");
        found.favorite = !found.favorite; saveDB();
        let status = found.favorite ? "⭐ DIKUNCI (Favorite)" : "🔓 DILEPAS DARI FAVORIT";
        return message.reply(`✅ Ikan **${fName}** (ID: ${targetId}) sekarang **${status}**!`);
    }

    if (command === 'givefish') {
        const targetUser = message.mentions.users.first();
        const targetId = parseInt(args[1]);
        let amount = parseInt(args[2]);
        if (!targetUser || targetUser.id === user.id || isNaN(targetId)) return message.reply("❌ Format: `ngivefish @user [ID] [Jumlah]`");
        
        let foundData = null, fName = "";
        for (const [name, data] of Object.entries(userData.fishes)) { if (data.id === targetId) { foundData = data; fName = name; break; } }
        if (!foundData) return message.reply("❌ ID Ikan tidak ditemukan di tasmu!");
        if (foundData.favorite) return message.reply("❌ Lepas dulu favorit ikan ini!");
        if (isNaN(amount) || amount <= 0) amount = 1;
        if (foundData.count < amount) return message.reply(`❌ Jumlah ikan **${fName}** kurang!`);
        
        if (!NAKOS_DB[targetUser.id]) NAKOS_DB[targetUser.id] = { wallet:0, bank:0, usd:0, card: "2443", xp:0, level:1, streak:0, lastClaimed:0, isFirstTime:true, lootboxes:0, activeRod:1, spent:0, ownedRods:[1], fishes:{}, crystals:{}, items:{}, totems:{}, location: "Pulau 1", travelingTo: null, arrivalTime: 0, ownedBoats: [], activeBoat: 0 };
        let targetUserData = NAKOS_DB[targetUser.id];
        if (!targetUserData.fishes) targetUserData.fishes = {};
        
        foundData.count -= amount;
        if (foundData.count <= 0) delete userData.fishes[fName];
        if (!targetUserData.fishes[fName]) targetUserData.fishes[fName] = { rarity: foundData.rarity, count: 0, id: Math.floor(Math.random() * 90000) + 10000, favorite: false };
        targetUserData.fishes[fName].count += amount; saveDB();
        return message.reply(`✅ Berhasil mengirimkan **${amount}x ${fName}** kepada **${targetUser.username}**!`);
    }

    if (command === 'sell' || command === 'sellfish') {
        let target = args[0] ? args[0].toLowerCase() : null;
        if (!target) return message.reply("❌ Format salah! Gunakan `nsell all`, `nsell [Tier]`, atau `nsell [ID]`");
        let totalEarned = 0, toSell = [];

        if (target === 'all') { 
            for (const [fName, fData] of Object.entries(userData.fishes)) { if (!fData.favorite) toSell.push(fName); } 
            if (toSell.length === 0) return message.reply("❌ Tidak ada ikan yang bisa dijual!");
            for (const fName of toSell) { let fData = userData.fishes[fName]; totalEarned += getFishData(fData.rarity).price * fData.count; delete userData.fishes[fName]; }
            userData.wallet += totalEarned; saveDB(); 
            return message.reply(`Anda berhasil menjual semua ikan dan mendapatkan **${formatRp(totalEarned)}**`);
        } 
        else if (["common", "rare", "legendary", "mythic", "secret", "extinct", "limited", "apex", "special", "hunt"].includes(target.replace("megalodon ", "").replace("kraken ", ""))) { 
            for (const [fName, fData] of Object.entries(userData.fishes)) { if (!fData.favorite && fData.rarity.toLowerCase().includes(target)) toSell.push(fName); } 
        } 
        else if (!isNaN(parseInt(target))) {
            let fishId = parseInt(target);
            for (const [fName, fData] of Object.entries(userData.fishes)) { if (fData.id === fishId) { if (fData.favorite) return message.reply(`❌ Ikan **${fName}** sedang difavoritkan!`); toSell.push(fName); break; } }
        } else { return message.reply("❌ Format salah! Gunakan `nsell all`, `nsell [Tier]`, atau `nsell [ID]`"); }

        if (toSell.length === 0) return message.reply("❌ Tidak ada ikan yang bisa dijual!");
        let nota = `💰 **NOTA PASAR LELANG NAKOS** 💰\n──────────────────────────────\n`;
        for (const fName of toSell) { 
            let fData = userData.fishes[fName]; let itemPrice = getFishData(fData.rarity).price * fData.count; totalEarned += itemPrice; 
            nota += `${fName} (\`${fData.rarity}\`) x${fData.count} = **${formatRp(itemPrice)}**\n`; delete userData.fishes[fName]; 
        }
        userData.wallet += totalEarned; saveDB(); nota += `──────────────────────────────\n💵 **Total Masuk Wallet:** \`${formatRp(totalEarned)}\``;
        return message.reply(nota);
    }

    if (command === 'sc' || command === 'sellcrystal') {
        let target = args[0] ? args[0].toLowerCase() : null;
        if (!target) return message.reply("❌ Format salah! Gunakan `nsc all` atau `nsc [Nama Crystal]`");
        let totalEarnedUSD = 0, toSell = [];

        if (target === 'all') { 
            for (const [cName, count] of Object.entries(userData.crystals)) { if (count > 0) toSell.push(cName); } 
            if (toSell.length === 0) return message.reply("❌ Tidak ada crystal yang bisa dijual!");
            for (const cName of toSell) { let cData = CRYSTAL_DATA.find(x => x.name === cName); if (cData) { totalEarnedUSD += cData.sellPrice * userData.crystals[cName]; delete userData.crystals[cName]; } }
            userData.usd += totalEarnedUSD; saveDB(); 
            return message.reply(`Anda berhasil menjual semua crystal dan mendapatkan **${formatUsd(totalEarnedUSD)}** ke saldo USD!`);
        } 
        else {
            let searchName = args.join(" ").toLowerCase();
            for (const [cName, count] of Object.entries(userData.crystals)) { if (cName.toLowerCase().includes(searchName) && count > 0) { toSell.push(cName); break; } }
            if (toSell.length === 0) return message.reply("❌ Crystal tidak ditemukan di tasmu!");
            
            let nota = `💰 **NOTA PASAR CRYSTAL NAKOS** 💰\n──────────────────────────────\n`;
            for (const cName of toSell) { 
                let cData = CRYSTAL_DATA.find(x => x.name === cName);
                if (cData) {
                    let itemPrice = cData.sellPrice * userData.crystals[cName]; totalEarnedUSD += itemPrice; 
                    nota += `${cData.emoji} ${cName} x${userData.crystals[cName]} = **${formatUsd(itemPrice)}**\n`; delete userData.crystals[cName]; 
                }
            }
            userData.usd += totalEarnedUSD; saveDB(); nota += `──────────────────────────────\n💵 **Total Masuk Saldo USD:** \`${formatUsd(totalEarnedUSD)}\``;
            return message.reply(nota);
        }
    }

    // ================= 7. GACHA & HARIAN =================
    if (command === 'opl') {
        if (userData.lootboxes <= 0) return message.reply("Anda tidak mempunyai lootbox");
        let openCount = 1; 
        if (args[0] === 'all') openCount = userData.lootboxes; else if (parseInt(args[0])) openCount = parseInt(args[0]);
        if (userData.lootboxes < openCount) return message.reply("Lootbox kurang!");
        
        userData.lootboxes -= openCount;
        let rewardTxt = "💰 **HADIAH LOOTBOX**\n──────────────────────────────\n";
        let cCounts = {}, tCounts = {};

        const getGacha = (dataArray) => {
            let rng = Math.random() * 100, cum = 0;
            for (let item of dataArray) { cum += item.chance; if (rng <= cum) return item; }
            return dataArray[dataArray.length - 1]; 
        };

        for (let j = 0; j < openCount; j++) {
            for(let i=0; i<2; i++) { let c = getGacha(CRYSTAL_DATA); cCounts[c.name] = (cCounts[c.name]||0)+1; userData.crystals[c.name] = (userData.crystals[c.name]||0)+1; }
            for(let i=0; i<2; i++) { let t = getGacha(TOTEM_DATA); tCounts[t.name] = (tCounts[t.name]||0)+1; userData.totems[t.name] = (userData.totems[t.name]||0)+1; }
        }

        for (let key in cCounts) { let c = CRYSTAL_DATA.find(x => x.name === key); rewardTxt += `${c.emoji} ${c.name} ${cCounts[key]}x\n`; }
        for (let key in tCounts) { let t = TOTEM_DATA.find(x => x.name === key); rewardTxt += `${t.emoji} ${t.name} ${tCounts[key]}x\n`; }
        let cash = openCount * (Math.floor(Math.random() * 20000) + 10000);
        userData.wallet += cash; saveDB();
        rewardTxt += `\n💵 **Cash**: ${formatRp(cash)}`;
        return message.reply({ embeds: [new EmbedBuilder().setColor('#F1C40F').setDescription(rewardTxt)] });
    }

    if (command === 'daily') {
        const now = Date.now();
        let resetTime = new Date(); resetTime.setUTCHours(7, 0, 0, 0); 
        if (now < resetTime.getTime()) resetTime.setUTCDate(resetTime.getUTCDate() - 1);
        
        if (userData.lastClaimed >= resetTime.getTime()) return message.reply("❌ Kamu sudah claim daily hari ini, silahkan tunggu jam 14:00 WIB");
        
        if (userData.lastClaimed && (now - userData.lastClaimed > 172800000)) userData.streak = 1; else userData.streak += 1;
        
        let gainedBal = userData.isFirstTime ? 100000 : Math.floor(Math.random() * 50000) + 20000;
        userData.wallet += gainedBal; userData.xp += 200; userData.lootboxes += 2;
        userData.lastClaimed = now; userData.isFirstTime = false; saveDB();
        return message.reply(`🌅 **DAILY REWARD!**\n💰 Saldo: **${formatRp(gainedBal)}**\n🔥 Strike: **${userData.streak} Hari**\n📦 Lootbox: **2x Box**`);
    }

    // ================= 8. ROD SYSTEM & SHOP =================
    if (command === 'rod') {
        let page = 0, ownedList = userData.ownedRods.sort((a,b) => a - b); 
        const createEmbed = (p) => {
            const rod = ROD_DATA.find(r => r.id === ownedList[p]);
            const isEquipped = userData.activeRod === rod.id;
            return new EmbedBuilder().setTitle("🎒 Ransel Pancingan").setColor(isEquipped ? '#f1c40f' : '#3498db')
                .addFields({ name: "📋 Nama Rod", value: `${isEquipped ? "⭐ " : ""}\`${rod.name}\``, inline: true }, { name: "🆔 ID Rod", value: `\`#${rod.id}\``, inline: true }, { name: "📈 Luck State", value: `\`${rod.luckLabel}\``, inline: true })
                .setImage(rod.img || null).setFooter({ text: `Pancingan ${p + 1} dari ${ownedList.length} | Status: ${isEquipped ? 'Dipakai (Equipped)' : 'Disimpan'}` });
        };

        const getBtns = (p) => {
            const rod = ROD_DATA.find(r => r.id === ownedList[p]);
            const isEquipped = userData.activeRod === rod.id;
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('back').setLabel('◀').setStyle(ButtonStyle.Primary).setDisabled(p === 0),
                new ButtonBuilder().setCustomId('equip').setLabel('Equip').setStyle(ButtonStyle.Success).setDisabled(isEquipped),
                new ButtonBuilder().setCustomId('next').setLabel('▶').setStyle(ButtonStyle.Primary).setDisabled(p === ownedList.length - 1)
            );
        };

        const msg = await message.reply({ embeds: [createEmbed(page)], components: [getBtns(page)] });
        const coll = msg.createMessageComponentCollector({ time: 120000 });
        coll.on('collect', async i => {
            if (i.user.id !== user.id) return i.reply({ content: "Gunakan command sendiri!", ephemeral: true });
            if (i.customId === 'next') page++; 
            else if (i.customId === 'back') page--;
            else if (i.customId === 'equip') { userData.activeRod = ownedList[page]; saveDB(); }
            await i.update({ embeds: [createEmbed(page)], components: [getBtns(page)] });
        });
        return;
    }

    if (command === 'shop') {
        const embed = new EmbedBuilder().setTitle("✨ 777 PREMIUM SHOP").setColor('#F1C40F').setDescription("**WAJIB BELI BERURUTAN!**\n──────────────────────────────");
        let rodText1 = "", rodText2 = "";
        ROD_DATA.forEach(r => { 
            if (r.id !== 24) {
                let priceLabel = r.price === 0 ? 'GRATIS' : (r.currency === 'usd' ? formatUsd(r.price) : formatRp(r.price));
                let txt = `**[#${r.id}]** ${r.name} ─ ${priceLabel}\n`;
                if (r.id <= 12) rodText1 += txt; else rodText2 += txt;
            }
        });
        embed.addFields({ name: "🎣 PANCINGAN (ID 1-12)", value: rodText1, inline: true }, { name: "🎣 PANCINGAN (ID 13-23)", value: rodText2, inline: true });
        
        let totemText = "";
        TOTEM_DATA.forEach(t => { totemText += `**[${t.id}]** ${t.emoji} **${t.name}** ─ ${formatRp(t.price)}\n`; });

        embed.addFields(
            { name: "\u200b", value: "──────────────────────────────" }, 
            { name: "🗿 TOTEM SHOP", value: totemText, inline: false },
            { name: "\u200b", value: "💡 *Ketik `nbuy [ID]` untuk beli pancingan atau Totem.*" }
        );
        return message.reply({ embeds: [embed] });
    }

    if (command === 'buy') {
        const input = args[0] ? args[0].toUpperCase() : "";
        const totem = TOTEM_DATA.find(t => t.id === input);
        if (totem) {
            if (userData.wallet < totem.price) return message.reply("❌ Uang di dompet lu kurang!");
            userData.wallet -= totem.price; userData.totems[totem.name] = (userData.totems[totem.name] || 0) + 1; saveDB();
            return message.reply(`✅ Berhasil membeli ${totem.emoji} **${totem.name}**!`);
        }

        const id = parseInt(args[0]);
        if (isNaN(id)) return message.reply("❌ Masukkan ID Pancingan atau ID Totem! (Contoh: nbuy 1 atau nbuy T1)");
        
        const rod = ROD_DATA.find(r => r.id === id);
        if (!rod) return message.reply("❌ Barang tidak ditemukan!");
        if (userData.ownedRods.includes(id)) return message.reply("❌ Sudah punya!");
        
        const maxOwned = Math.max(...userData.ownedRods);
        if (id !== maxOwned + 1) return message.reply(`❌ Harus urut! Beli ID **#${maxOwned + 1}** dulu.`);
        
        if (rod.currency === 'usd') {
            if (userData.usd < rod.price) return message.reply("❌ USD kurang!");
            userData.usd -= rod.price;
        } else {
            if (userData.wallet < rod.price) return message.reply("❌ IDR kurang!");
            userData.wallet -= rod.price; userData.spent += rod.price;
        }
        userData.ownedRods.push(id); userData.activeRod = id; saveDB();
        
        // [REVISI V1] Saat beli pancingan, muncul Embed dengan Gambar Pancingannya
        const embedBuy = new EmbedBuilder()
            .setTitle("🛒 Pembelian Berhasil!")
            .setDescription(`✅ <@${user.id}> berhasil membeli **${rod.name}**!\nGunakan \`nrod\` untuk melihat pancingan kamu.`)
            .setColor('#2ecc71')
            .setImage(rod.img || null); 
        
        return message.reply({ embeds: [embedBuy] });
    }
});

client.on('error', (e) => console.error(e));
process.on('unhandledRejection', (e) => console.error(e));
if (!process.env.DISCORD_TOKEN && CONFIG.token === "TOKEN_BOT_KAMU_DISINI") { console.error('❌ Token belum diisi! Buat file .env (lihat .env.example)'); process.exit(1); }
client.login(CONFIG.token);
