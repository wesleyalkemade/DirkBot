/*jshint -W041, -W083*/

var fs = require("fs");
var jsonfile = require('jsonfile');
var amazejs = require('../startbot.js');
var request = require("request");

var discord = amazejs.getDiscord();
var botId = amazejs.getBotId();
var AxSServer = amazejs.getAxSId();
var config = amazejs.getConfig();

exports.commands = {
	calculate: {
	    permission: "axs.host.calculate",
		description: "This will calculate the scores of a multiplayer game with the AxS score system.",
		usage: "calculate",
		examples: ["calculate"],
	    func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			if(serverID !== AxSServer)
				return;

	        var permissionFile = "";
	        var userSettingFile = "";
			var resultArray = [];
			var totalModifiers = 0;

	        var curDate = new Date();
	        var curDateJson = {
	            "year": curDate.getFullYear(),
	            "month": curDate.getMonth(),
	            "day": curDate.getDate(),
	            "hours": curDate.getHours(),
	            "minutes": curDate.getMinutes(),
	            "seconds": curDate.getSeconds()
	        };

	        if (fs.readFileSync("configfiles/permissions.json").length > 0) {
	            permissionFile = JSON.parse(fs.readFileSync("configfiles/permissions.json"));
	        }

	        if (fs.readFileSync("configfiles/permissions.json").length > 0) {
	            userSettingFile = JSON.parse(fs.readFileSync("configfiles/config.usersettings.json"));
	        }

	        if (permissionFile.hasOwnProperty("user" + context.userID)) {
	            var permFound = 0;

	            for (var perm in permissionFile["user" + context.userID]) {
	                if (permissionFile["user" + context.userID][perm] == "axs.host.calculate") {
	                    permFound = 1;
	                    break;
	                }
	            }

	            if (!permFound) {
	                if (userSettingFile["user" + context.userID]) {
	                    var date = userSettingFile["user" + context.userID].calculatelastused;

	                    curDateJson = {
	                        "year": curDate.getFullYear(),
	                        "month": curDate.getMonth(),
	                        "day": curDate.getDate(),
	                        "hours": curDate.getHours(),
	                        "minutes": curDate.getMinutes(),
	                        "seconds": curDate.getSeconds()
	                    };

	                    if (Date.parse(curDate.month + '/' + curDateJson.day + '/' + curDateJson.year + ' ' + curDateJson.hours + ':' + curDateJson.minutes + ':' + curDateJson.seconds) <
	                        Date.parse(date.month + '/' + date.day + '/' + date.year + ' ' + date.hours + ':' + date.minutes + ':' + date.seconds)) {
	                        var cdtimer = Date.parse(date.month + '/' + date.day + '/' + date.year + ' ' + date.hours + ':' + date.minutes + ':' + date.seconds) -
	                            Date.parse(curDateJson.month + '/' + curDateJson.day + '/' + curDateJson.year + ' ' + curDateJson.hours + ':' + curDateJson.minutes + ':' + curDateJson.seconds);

	                        reply("**<@" + context.userID + ">, This command has a cooldown timer. Time left before you can use it again: " + (cdtimer / 1000) + " seconds.**");
	                        return;
	                    }
	                } else {
	                    amazejs.sendWrong(context.channelID, context.userID,
	                        "<@" + context.userID + ">, your current match hasn't been set yet. Please use `!curmatch`");
	                    return;
	                }
	            }
	        }

	        // write curDate in file with +1 minute for the cooldown
	        curDateJson.minutes += 1;
	        userSettingFile["user" + context.userID].calculatelastused = curDateJson; // put new data in array

	        jsonfile.writeFile("configfiles/config.usersettings.json", userSettingFile);

	        // ########################################
	        // continue the normal !calculate command
	        context.userID = context.userID.replace(/</g, "");
	        context.userID = context.userID.replace(/@/g, "");
	        context.userID = context.userID.replace(/>/g, "");

	        var mpid = "undefined";
			var team1name = "undefined";
	        var team2name = "undefined";
	        var modifiersarr = null;

	        for (var i in userSettingFile) {
	            if ("user" + context.userID == i) {
	                mpid = userSettingFile[i].mproomID;
	                team1name = userSettingFile[i].curmatchTeamOne;
	                team2name = userSettingFile[i].curmatchTeamTwo;
	                modifiersarr = userSettingFile[i].modifiers;
	            }
	        }

	        if (mpid == "undefined" || team1name == "undefined" || team2name == "undefined") {
	            amazejs.sendWrong(context.channelID, context.userID,
	                "<@" + context.userID + ">, your current match hasn't been set yet. Please use `!curmatch`");
	            return;
	        }

	        if (Object.keys(modifiersarr).length === 0) {
	            amazejs.sendWrong(context.channelID, context.userID,
	                "<@" + context.userID + ">, you have not set a modifier yet. Please use `!modifier`");
	            return;
	        }

	        if (!argsm[1]) {
	            getMatchJSON(mpid, team1name, team2name, function(Json, mp_id, team1, team2) {
	                // variables for team scores
	                tOneScore = 0;
	                tTwoScore = 0;

	                if (Object.keys(getUserSettings()["user" + context.userID].modifiers).length != Object.keys(Json.games).length) {
	                    var modifierstring = 0;
	                    if (getUserSettings()["user" + context.userID].modifiers.length == "undefined")
	                        modifierstring = 0;
	                    else
	                        modifierstring = Object.keys(getUserSettings()["user" + context.userID].modifiers).length;

	                    amazejs.sendWrong(context.channelID, context.userID,
	                        "You do not have enough modifiers set for the calculations to work." +
	                        "\nYou need `" + Json.games.length + "` modifiers to make it work." +
	                        "\nYou currently have `" + modifierstring + "` modifiers set.");
	                    return;
	                }

	                var mapCounter = 0;

					totalModifiers = Object.keys(getUserSettings()["user" + context.userID].modifiers).length;

	                for (var md in getUserSettings()["user" + context.userID].modifiers) {
	                    var modifier = getUserSettings()["user" + context.userID].modifiers[md];

						if (Json.games[mapCounter].scores[0] == null) {
							Json.games[mapCounter].scores[0] = 80;
							Json.games[mapCounter].scores[0].count50 = 1;
							Json.games[mapCounter].scores[0].count100 = 1;
							Json.games[mapCounter].scores[0].count300 = 1;
							Json.games[mapCounter].scores[0].countmiss = 1;
							Json.games[mapCounter].scores[0].countkatu = 1;
						}
						if (Json.games[mapCounter].scores[3] == null) {
							Json.games[mapCounter].scores[3] = 80;
							Json.games[mapCounter].scores[3].count50 = 1;
							Json.games[mapCounter].scores[3].count100 = 1;
							Json.games[mapCounter].scores[3].count300 = 1;
							Json.games[mapCounter].scores[3].countmiss = 1;
							Json.games[mapCounter].scores[3].countkatu = 1;
						}
						if (Json.games[mapCounter].scores[1] == null) {
							Json.games[mapCounter].scores[1] = 1;
							Json.games[mapCounter].scores[1].count50 = 1;
							Json.games[mapCounter].scores[1].count100 = 1;
							Json.games[mapCounter].scores[1].count300 = 1;
							Json.games[mapCounter].scores[1].countmiss = 1;
							Json.games[mapCounter].scores[1].countkatu = 1;
						}
						if (Json.games[mapCounter].scores[2] == null) {
							Json.games[mapCounter].scores[2] = 1;
							Json.games[mapCounter].scores[2].count50 = 1;
							Json.games[mapCounter].scores[2].count100 = 1;
							Json.games[mapCounter].scores[2].count300 = 1;
							Json.games[mapCounter].scores[2].countmiss = 1;
							Json.games[mapCounter].scores[2].countkatu = 1;
						}
						if (Json.games[mapCounter].scores[4] == null) {
							Json.games[mapCounter].scores[4] = 1;
							Json.games[mapCounter].scores[4].count50 = 1;
							Json.games[mapCounter].scores[4].count100 = 1;
							Json.games[mapCounter].scores[4].count300 = 1;
							Json.games[mapCounter].scores[4].countmiss = 1;
							Json.games[mapCounter].scores[4].countkatu = 1;
						}
						if (Json.games[mapCounter].scores[5] == null) {
							Json.games[mapCounter].scores[5] = 1;
							Json.games[mapCounter].scores[5].count50 = 1;
							Json.games[mapCounter].scores[5].count100 = 1;
							Json.games[mapCounter].scores[5].count300 = 1;
							Json.games[mapCounter].scores[5].countmiss = 1;
							Json.games[mapCounter].scores[5].countkatu = 1;
						}

	                    tOneAccPlayer = Json.games[mapCounter].scores[0]; // Accuracy player of Team 1
	                    tOneAccTotalFruit = parseInt(tOneAccPlayer.count50) + parseInt(tOneAccPlayer.count100) + parseInt(tOneAccPlayer.count300) +
	                        parseInt(tOneAccPlayer.countmiss) + parseInt(tOneAccPlayer.countkatu);
	                    tOneAccFruitCaught = parseInt(tOneAccPlayer.count50) + parseInt(tOneAccPlayer.count100) + parseInt(tOneAccPlayer.count300);
	                    tOneAcc = ((tOneAccFruitCaught / tOneAccTotalFruit) * 100).toFixed(2); // Accuracy

	                    tTwoAccPlayer = Json.games[mapCounter].scores[3]; // Accuracy player of Team 2
	                    tTwoAccTotalFruit = parseInt(tTwoAccPlayer.count50) + parseInt(tTwoAccPlayer.count100) + parseInt(tTwoAccPlayer.count300) +
	                        parseInt(tTwoAccPlayer.countmiss) + parseInt(tTwoAccPlayer.countkatu);
	                    tTwoAccFruitCaught = parseInt(tTwoAccPlayer.count50) + parseInt(tTwoAccPlayer.count100) + parseInt(tTwoAccPlayer.count300);
	                    tTwoAcc = ((tTwoAccFruitCaught / tTwoAccTotalFruit) * 100).toFixed(2); // Accuracy

	                    tOneFinalScore = Math.ceil((parseInt(Json.games[mapCounter].scores[1].score) + parseInt(Json.games[mapCounter].scores[2].score)) * Math.pow((tOneAcc / 100), modifier));
	                    tTwoFinalScore = Math.ceil((parseInt(Json.games[mapCounter].scores[4].score) + parseInt(Json.games[mapCounter].scores[5].score)) * Math.pow((tTwoAcc / 100), modifier));

	                    if (tOneFinalScore < tTwoFinalScore) {
							if(mapCounter == 0)
								resultArray[mapCounter] = "`This is map " + (mapCounter + 1)  + " (Map name is shown below)`\nLink to multiplayer: **<https://osu.ppy.sh/mp/" + Json.match.match_id + ">**\n<@" + context.userID + ">: \nMap link: **https://osu.ppy.sh/b/" + Json.games[mapCounter].beatmap_id + "**. \n" + "`" + team2 + "`" + " has won. " + "`" + team1 + "`" + " score: `" + addDot(tOneFinalScore) + "` | " + "`" + team2 + "`" + " score: `" + addDot(tTwoFinalScore) + "`. Score difference: `" + addDot((tTwoFinalScore - tOneFinalScore)) + "`";
							else
								resultArray[mapCounter] = "`This is map " + (mapCounter + 1)  + " (Map name is shown below)`\n<@" + context.userID + ">: \nMap link: **https://osu.ppy.sh/b/" + Json.games[mapCounter].beatmap_id + "**. \n" + "`" + team2 + "`" + " has won. " + "`" + team1 + "`" + " score: `" + addDot(tOneFinalScore) + "` | " + "`" + team2 + "`" + " score: `" + addDot(tTwoFinalScore) + "`. Score difference: `" + addDot((tTwoFinalScore - tOneFinalScore)) + "`";
	                    } else {
							if(mapCounter == 0)
								resultArray[mapCounter] = "`This is map " + (mapCounter + 1)  + " (Map name is shown below)`\nLink to multiplayer: **<https://osu.ppy.sh/mp/" + Json.match.match_id + ">**\n<@" + context.userID + ">: \nMap link: **https://osu.ppy.sh/b/" + Json.games[mapCounter].beatmap_id + "**. \n" + "`" + team1 + "`" + " has won. " + "`" + team1 + "`" + " score: `" + addDot(tOneFinalScore) + "` | " + "`" + team2 + "`" + " score: `" + addDot(tTwoFinalScore) + "`. Score difference: `" + addDot((tOneFinalScore - tTwoFinalScore)) + "`";
							else
								resultArray[mapCounter] = "`This is map " + (mapCounter + 1)  + " (Map name is shown below)`\n<@" + context.userID + ">: \nMap link: **https://osu.ppy.sh/b/" + Json.games[mapCounter].beatmap_id + "**. \n" + "`" + team1 + "`" + " has won. " + "`" + team1 + "`" + " score: `" + addDot(tOneFinalScore) + "` | " + "`" + team2 + "`" + " score: `" + addDot(tTwoFinalScore) + "`. Score difference: `" + addDot((tOneFinalScore - tTwoFinalScore)) + "`";
	                    }

	                    mapCounter++;
	                }

					for(var i = 0; i < resultArray.length; i++){
					    (function(i){
					        setTimeout(function(){
					            reply(resultArray[i]);
					        }, 1200 * i);
					    }(i));
					}

	                return;
	            });
	        } else {
	            reply("<@" + context.userID + ">, command name `calculate`\n" +
	                "Syntax: **!calculate**\n" +
	                "Example: `!calculate");
	            return;
	        }
	    }
	},
	curmatch: {
		permission: "axs.host.curmatch",
		description: "This will set the multiplayer match for yourself. This is used for the command \"calculate\".",
		usage: "curmatch [mproomID] [Team 1 name] [Team 2 name]",
		examples: ["curmatch 25200157 1_Miss_Gods Never_Give_Up", "curmatch 30870075 wesley_is_the_best sartan_is_the_best"],
		func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			var commandPrefix = amazejs.commandPrefix(serverID);
			var usersettings = jsonfile.readFileSync("configfiles/config.usersettings.json");

			if(serverID !== AxSServer)
				return;

			if(!argsm[1]) {
				if(usersettings.hasOwnProperty("user" + context.userID)) {
					amazejs.sendWrong(context.channelID, context.userID,
							"**Your current match settings are: \n**" +
							"Multiplayer match id: `" + usersettings["user" + context.userID].mproomID + "`\n" +
							"Team name 1: `" + usersettings["user" + context.userID].curmatchTeamOne + "`\n" +
							"Team name 2: `" + usersettings["user" + context.userID].curmatchTeamTwo + "`\n\n" +
							"Syntax: `" + commandPrefix + "curmatch` `mproomID` `Team 1 name` `Team 2 name`\n" +
							"`mproomID`: Copy the number after `https://osu.ppy.sh/mp/` (link to the multiplayer room), `https://osu.ppy.sh/mp/30074721` will become `30074721`\n" +
							"`Team 1 name`: Enter the team name here, when there is a space in a team name replace that with a `_`: `wesley is the best` will become `wesley_is_the_best`\n" +
							"`Team 2 name`: Same as `Team 1 name`\n\n" +
							"Example: `" + commandPrefix + "curmatch 25200157 1_Miss_Gods Never_Give_Up` (use _ instead of space in team names)");
				}
				else {
					amazejs.sendWrong(context.channelID, context.userID,
							"Syntax: `" + commandPrefix + "curmatch` `mproomID` `Team 1 name` `Team 2 name`\n" +
							"`mproomID`: Copy the number after `https://osu.ppy.sh/mp/` (link to the multiplayer room), `https://osu.ppy.sh/mp/30074721` will become `30074721`\n" +
							"`Team 1 name`: Enter the team name here, when there is a space in a team name replace that with a `_`: `wesley is the best` will become `wesley_is_the_best`\n" +
							"`Team 2 name`: Same as `Team 1 name`\n\n" +
							"Example: `" + commandPrefix + "curmatch 25200157 1_Miss_Gods Never_Give_Up` (use _ instead of space in team names)");
				}

				return;
			}

			var args = argsm[1];
			args = args.trim().split(" ");

			if(args[0] == "remove") {
				if(usersettings.hasOwnProperty("user" + context.userID)) {
					usersettings["user" + context.userID].modifiers = {};
					usersettings["user" + context.userID].mproomID = "";
					usersettings["user" + context.userID].curmatchTeamOne = "";
					usersettings["user" + context.userID].curmatchTeamTwo = "";

					jsonfile.writeFile("configfiles/config.usersettings.json", usersettings);

					reply("<@" + context.userID + ">, your current match settings have been removed.");
				}
				else {
					reply("<@" + context.userID + ">, you do not have a current match set.");
				}

				return;
			}

			if(!usersettings.hasOwnProperty("user" + context.userID)) {
				usersettings["user" + context.userID] = {
					curMatchTeamOne: args[0],
					curmatchTeamTwo: args[1],
					calculatelastused: {year: 1900, month: 0, day: 1, hours: 0, minutes: 0, seconds: 0},
					modifiers: {}
				};
			}
			else {
				usersettings["user" + context.userID].mproomID = args[0];
				usersettings["user" + context.userID].curmatchTeamOne = args[1];
				usersettings["user" + context.userID].curmatchTeamTwo = args[2];
			}

			jsonfile.writeFile("configfiles/config.usersettings.json", usersettings);

			reply("<@" + context.userID + ">, you have succesfully saved the following data for the current match:\n" +
					"Multiplayer match id: `" + args[0] + "`\n" +
					"Team name 1: `" + args[1] + "`\n" +
					"Team name 2: `" + args[2] + "`");
		}
	},
	modifier: {
		permission: "axs.host.modifier",
		description: "This will show, add or remove a modifier. ",
		usage: "modifier [show/add/remove] [modifier]",
		examples: ["modifier show", "modifier add 5", "modifier remove 0"],
		func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			var commandPrefix = amazejs.commandPrefix(serverID);
			var configFile = JSON.parse(fs.readFileSync("configfiles/config.usersettings.json"));

			if(serverID !== AxSServer)
				return;

			if(!argsm[1])
			{
				amazejs.sendWrong(context.channelID, context.userID,
						"Syntax: **!modifier <show/add/remove> <modifier>**\n" +
						"<show/add/remove>: \n" +
						"`show`: Show all the modifiers with the corresponding ID (<modifier> is not required for this) \n" +
						"`add`: Add a new modifier for the next map\n" +
						"`remove`: Remove a modifier by ID, not modifier (example below), you can also use `all` instead of an ID to remove them all\n" +
						"Example remove: ID: `6` | Modifier: `5`, if you want to remove this modifier you type `!modifier remove 6`, NOT `!modifier remove 5`. \n" +
						"If you want to remove all modifiers, you type the following: `!modifier remove all` \n\n" +
						"Example: `!modifier add 5`, `!modifier show`, `!modifier remove 6`, `!modifier remove all`");
                return;
			}

			var args = argsm[1];
			args = args.trim().split(" ");

			if(args[0] == "show")
			{
				if(configFile.hasOwnProperty("user" + context.userID))
				{
					if(configFile["user" + context.userID].hasOwnProperty("modifiers"))
					{
						var showModifiers = "";
						for(var cm in configFile["user" + context.userID].modifiers)
						{
							showModifiers += "ID: `" + cm + "` | Modifier: `" + configFile["user" + context.userID].modifiers[cm] + "` \n";
						}

						reply("**<@" + context.userID + ">, your current modifiers are:** \n" +
							showModifiers);
					}
					else
					{
						amazejs.sendWrong(context.channelID, context.userID,
								"<@" + context.userID + ">, you do not have any modifiers set. Please use `!modifier add <modifier>`.");
						return;
					}
				}
				else
				{
					amazejs.sendWrong(context.channelID, context.userID,
							"<@" + context.userID + ">, you do not have any modifiers set. Please use `!modifier add <modifier>`.");
					return;
				}
			}
			else if(args[0] == "add")
			{
				var last = 0;
				var overwriteJson = configFile["user" + context.userID].modifiers;

				for(var i in configFile["user" + context.userID].modifiers)
				{
					last = parseInt(i) + parseInt(1);
				}

				overwriteJson[last] = args[1];
				configFile["user" + context.userID].modifiers = overwriteJson;

				jsonfile.writeFile("configfiles/config.usersettings.json", configFile);

				var allModifiers = "";

				for(var oj in overwriteJson)
				{
					allModifiers += "ID: `" + oj + "` | Modifier: `" + overwriteJson[oj] + "`\n";
				}

				reply("<@" + context.userID + ">, you succesfully added `" + args[1] + "` to the modifiers. \n" +
					"**Current modifiers: ** \n" +
					allModifiers);
			}
			else if(args[0] == "remove")
			{
				if(args[1] == "all")
				{
					if(configFile.hasOwnProperty("user" + context.userID))
					{
						if(configFile["user" + context.userID].hasOwnProperty("modifiers"))
						{
							configFile["user" + context.userID].modifiers = {};

							console.log(configFile);

							jsonfile.writeFile("configfiles/config.usersettings.json", configFile);

							reply("<@" + context.userID + ">, succesfully removed all of your modifiers.");
						}
						else {
							reply("<@" + context.userID + ">, you don't have any modifiers set, nothing to remove.");
						}
					}
					else {
						reply("<@" + context.userID + ">, you don't have any modifiers set, nothing to remove.");
					}
				}
				else if(!isNaN(args[1]))
				{
					if(configFile.hasOwnProperty("user" + context.userID))
					{
						if(configFile["user" + context.userID].hasOwnProperty("modifiers"))
						{
							if(configFile["user" + context.userID].modifiers.hasOwnProperty(args[1]))
							{
								console.log(configFile["user" + context.userID].modifiers);

								for(var m in configFile["user" + context.userID].modifiers) {
									if(m === args[1]) {
										delete configFile["user" + context.userID].modifiers[m];
										break;
									}
								}

								jsonfile.writeFile("configfiles/config.usersettings.json", configFile);
								reply("<@" + context.userID + ">, succesfully removed ID `" + args[1] + "` from your current modifiers. ");
							}
							else
							{
								amazejs.sendWrong(context.channelID, context.userID,
									"<@" + context.userID + ">, this modifier does not exist (Are you using the ID?). Show all modifiers by typing `!modifier show`.");
								return;
							}
						}
						else
						{
							amazejs.sendWrong(context.channelID, context.userID,
									"<@" + context.userID + ">, you do not have any modifiers set. Please use `!modifier add <modifier>`.");
							return;
						}
					}
					else
					{
						amazejs.sendWrong(context.channelID, context.userID,
								"<@" + context.userID + ">, you do not have any modifiers set. Please use `!modifier add <modifier>`.");
						return;
					}
				}
				else if(!args[1])
				{
					amazejs.sendWrong(context.channelID, context.userID,
							"<@" + context.userID + ">, you entered an invalid character. Make sure it is a number.");
					return;
				}
				else
				{
					amazejs.sendWrong(context.channelID, context.userID,
							"<@" + context.userID + ">, you entered an invalid character. Make sure it is a number.");
					return;
				}
			}
			else
			{
				amazejs.sendWrong(context.channelID, context.userID,
						"<@" + context.userID + ">, the second parameter can only be `show`, `add` or `remove`.");
				return;
			}
		}
	},
	forum: {
		permission: "default",
		description: "This will show you the links to the AxS forum.",
		usage: "forum",
		examples: ["forum"],
		func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			if(serverID !== AxSServer)
				return;

			reply("<@" + context.userID + ">, \n\n" +
			"**AxSCtB first edition** is located here: <https://osu.ppy.sh/forum/p/4564877>\n" +
			"**AxSCtB second edition** is located here: <https://osu.ppy.sh/forum/t/513337>\n");
		}
	}
};

function queryApi(func, params, callback) {
    request("https://osu.ppy.sh/api/" + func + "?k=" + config.apiKeys.osu + params,
        function(error, response, body) {
            if (error || response.statusCode != 200) {
                log.error("queryApi " + func + ", Params: " + params +
                    ", Error: " + error + " - " + response.statusCode);
                return;
            }

            var json = JSON.parse(body);
            callback(json);
        });
}

function getUserSettings()
{
	var configFile = fs.readFileSync("configfiles/config.usersettings.json");
	if(configFile.length > 0)
		return JSON.parse(configFile);
	else
		return false;
}

function addDot(nStr) {
    nStr += '';
    x = nStr.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ' ' + '$2');
    }
    return x1 + x2;
}

// Return _ALL_ match details
function getMatchJSON(mp_id, team1, team2, callback) {
    request({
        url: "https://osu.ppy.sh/api/get_match?k=" + config.apiKeys.osu + "&mp=" + mp_id
    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(JSON.parse(body), mp_id, team1, team2);
        } else {
            console.error("Failed!");
            callback([]);
        }
    });
}

// get match details without teams
function getMatchJSONNoTeam(mp_id, callback) {
    request({
        url: "https://osu.ppy.sh/api/get_match?k=" + config.apiKeys.osu + "&mp=" + mp_id
    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(JSON.parse(body), mp_id);
        } else {
            console.error("Failed!");
            callback([]);
        }
    });
}

// Return the beatmap artist title and difficulty
function getBeatmapJSON(beatmap_id, callback) {
    request({
        url: "https://osu.ppy.sh/api/get_beatmaps?k=" + config.apiKeys.osu + "&b=" + beatmap_id
    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            returnjson = JSON.parse(body);

            callback(returnjson[0].artist + " - " + returnjson[0].title + " [" + returnjson[0].version + "]");
        } else {
            console.error("Failed");
            callback([]);
        }
    });
}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function getFiles (dir, files_){
    files_ = files_ || [];
    var files = fs.readdirSync(dir);
    for (var i in files){
        var name = dir + '/' + files[i];
        if (fs.statSync(name).isDirectory()){
            getFiles(name, files_);
        } else {
            files_.push(name);
        }
    }
    return files_;
}
