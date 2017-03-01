/*jshint -W061 */

var fs = require("fs");
var jsonfile = require('jsonfile');
var amazejs = require("../startbot.js");

var discord = amazejs.getDiscord();
var botId = amazejs.getBotId();
var dirkRoleName = "Dirken";

var config = exports.config = {};

exports.commands = {
	givemethepower: {
		permission: "default",
		description: "Assign the role \"" + dirkRoleName + "\" to yourself and use the command again to gain all permission.",
		usage: "givemethepower",
		examples: ["givemethepower"],
		func: function(argsm, context, reply) {
			var discord = amazejs.getDiscord();
			var serverID = discord.channels[context.channelID].guild_id;
			var dirkRoleId = 0;
			var givePower = 0;
			var alreadyHavePower = 0;

			for(var i in discord.servers[context.serverID].roles) {
				if(discord.servers[context.serverID].roles[i].name == dirkRoleName) {
					dirkRoleId = discord.servers[context.serverID].roles[i].id;
				}
			}

			for(var j in discord.servers[context.serverID].members[context.userID].roles) {
				if(discord.servers[context.serverID].members[context.userID].roles[j] == dirkRoleId) {
					if(discord.servers[context.serverID].members[context.userID].roles[dirkRoleId] === undefined) {
						givePower = 1;
						break;
					}
					else {
						givePower = 0;
					}
				}
			}

			if(givePower) {
				var allPermission = JSON.parse(fs.readFileSync("configfiles/permissions.json"));

				if(!allPermission.hasOwnProperty("server" + serverID)) {
					allPermission["server" + serverID] = [];

					if(!allPermission["server" + serverID].hasOwnProperty("user" + context.userID)) {
						allPermission["server" + serverID]["user" + context.userID] = [];
					}
				}
				else {
					if(!allPermission["server" + serverID].hasOwnProperty("user" + context.userID)) {
						allPermission["server" + serverID]["user" + context.userID] = [];
					}
				}

				for(var l in allPermission["server" + serverID]["user" + context.userID]) {
					if(allPermission["server" + serverID]["user" + context.userID][l] == "*") {
						alreadyHavePower = 1;
						break;
					}
				}

				if(!alreadyHavePower) {
					var allPerm = ["*"];
					allPermission["server" + serverID]["user" + context.userID] = allPermission["server" + serverID]["user" + context.userID].concat(allPerm);

					jsonfile.writeFileSync("configfiles/permissions.json", allPermission);
					amazejs.reloadPermissions();

					discord.sendMessage({
					    to: context.userID,
					    message: "You now have all permissions enabled on the server `" + discord.servers[serverID].name + "`."
					});
				}
				else {
					discord.sendMessage({
					    to: context.userID,
					    message: "You already have all permissions on the server `" + discord.servers[serverID].name + "`. "
					});
				}
			}
			else {
				var commandPrefix = amazejs.commandPrefix(serverID);

				discord.sendMessage({
				    to: context.userID,
				    message: "To get permissions on this server you need to create a new role `" + dirkRoleName + "` (Don't forget the capital letters). \n" +
							"Once you've created this role give yourself the role, **not** the bot. \nWhen you have the role `" + dirkRoleName + "`, go ahead and use the command `" + commandPrefix + "givemethepower` in the designated server. \n" +
							"You will now get a confirmation message that you have all permissions enabled. Have fun!"
				});
			}
		}
	},
	changeprefix: {
		permission: "admin.changeprefix",
		description: "Changes the commandprefix to something different.",
		usage: "changeprefix [prefix]",
		examples: ["changeprefix !!", "changeprefix |", "changeprefix \\"],
		func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			var commandPrefix = amazejs.commandPrefix(serverID);
			var commandPrefixFile = JSON.parse(fs.readFileSync("configfiles/config.commandprefix.json"));

			if(!argsm[1] || argsm[1].length > 4) {
				amazejs.sendWrong(context.channelID, context.userID,
						"Syntax: `" + commandPrefix + "changeprefix` `prefix`\n" +
						"`prefix`: the new prefix \n" +
						"Example: `" + commandPrefix + "changeprefix 1!`");
				return;
			}

			if(argsm[1] == "!!" || argsm[1] == "!!!" || argsm[1] == "!!!!") {
				amazejs.sendWrong(context.channelID, context.userID,
						"**Invalid prefix: `!!`, `!!!`, `!!!!` are unavailable.**\n" +
						"Syntax: `" + commandPrefix + "changeprefix` `prefix`\n" +
						"`prefix`: the new prefix \n" +
						"Example: `" + commandPrefix + "changeprefix 1!`");
				return;
			}

			commandPrefixFile["server" + serverID] = argsm[1];
			jsonfile.writeFileSync("configfiles/config.commandprefix.json", commandPrefixFile);

			reply("<@" + context.userID + ">, changed the command prefix to `" + argsm[1] + "`.");
		}
	},
	addcommand: {
		permission: "admin.commands",
		description: "Creates a new text command.",
		usage: "addcommand [commandname] [text you want to show]",
		examples: ["addcommand ping pong", "addcommand test This is a test"],
		func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			var commandPrefix = amazejs.commandPrefix(serverID);

			allCommands = JSON.parse(fs.readFileSync("configfiles/commands.json"));
			var allcmd = allCommands.commands["server" + serverID];

			if(!argsm[1])
			{
				var createdCommands;
				var first = 0;

				for(var i in allCommands.commands["server" + serverID])
				{
					if(first === 0)
						createdCommands = "`" + allcmd[i].commandname + "`";
					else
						createdCommands += ", `" + allcmd[i].commandname + "`";

					first = 1;
				}

				if(createdCommands === undefined) createdCommands = "none";

				amazejs.sendWrong(context.channelID, context.userID,
						"Syntax: `" + commandPrefix + "addcommand` `commandname` `reply message`\n" +
						"`commandname`: The commandname goes here\n" +
						"`reply message`: The message that the bot will reply when you use this command\n" +
						"Example: `" + commandPrefix + "addcommand ping pong!`\n\n" +
						"The following commands have been created already: \n" + createdCommands);
				return;
			}

			var args = argsm[1];
			args = args.trim().split(" ");
			var makeCommand = 1;
			var commandName = args[0];
			args.splice(0,1);
			var replyMessage = args.join(' ');

			for(var c in allCommands.commands["server" + serverID])
			{
				if(makeCommand === 0)
					break;

				if(allcmd[c].commandname == commandName) makeCommand = 0;
			}

			if(makeCommand == 1)
			{
				if(!allCommands.commands.hasOwnProperty("server" + serverID)) {
					allCommands.commands["server" + serverID] = JSON.parse("{}");
				}

				allCommands.commands["server" + serverID][commandName] = {"commandname": commandName, "message": replyMessage};
				jsonfile.writeFileSync("configfiles/commands.json", allCommands);
				reply("<@" + context.userID + ">, succesfully created the command `" + commandPrefix + commandName + "`. ");
			}
			else
			{
				reply("<@" + context.userID + ">, the command `" + commandPrefix + commandName + "` already exists. Pick a different commandname.");
			}
		}
	},
	changecommand: {
		permission: "admin.commands",
		description: "Changes an already existing text command.",
		usage: "changecommand [commandname] [text you want to show]",
		examples: ["changecommand ping pong", "addcommand test This is no longer a test"],
		func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			var commandPrefix = amazejs.commandPrefix(serverID);

			allCommands = JSON.parse(fs.readFileSync("configfiles/commands.json"));
			var allcmd = allCommands.commands["server" + serverID];

			if(!argsm[1])
			{
				var createdCommands;
				var first = 0;

				console.log(allCommands.commands["server" + serverID]);

				for(var i in allCommands.commands["server" + serverID])
				{
					if(first === 0)
						createdCommands = "`" + allcmd[i].commandname + "`";
					else
						createdCommands += ", `" + allcmd[i].commandname + "`";

					first = 1;
				}

				if(createdCommands === undefined) createdCommands = "none";

				amazejs.sendWrong(context.channelID, context.userID,
						"Syntax: `" + commandPrefix + "changecommand` `commandname` `reply message`\n" +
						"`commandname`: The commandname goes here \n" +
						"`reply message`: The message that the bot will reply when you use this command\n" +
						"Example: `" + commandPrefix + "addcommand ping no more pong!`\n\n" +
						"The following commands can be changed: \n" + createdCommands);
				return;
			}

			var args = argsm[1];
			args = args.trim().split(" ");
			var changeCommand = 0;
			var commandName = args[0];
			args.splice(0,1);
			var replyMessage = args.join(' ');

			for(var c in allCommands.commands["server" + serverID])
			{
				if(changeCommand === 1)
					break;

				if(allcmd[c].commandname == commandName) changeCommand = 1;
			}

			if(changeCommand == 1)
			{
				allCommands.commands["server" + serverID][commandName] = {"commandname": commandName, "message": replyMessage};
				jsonfile.writeFileSync("configfiles/commands.json", allCommands);
				reply("<@" + context.userID + ">, the command `" + commandName + "` has been changed.");
			}
			else
			{
				reply("<@" + context.userID + ">, the command `" + commandName + "` does not exist.");
			}
		}
	},
	deletecommand: {
		permission: "admin.commands",
		description: "Delets an already existing text command.",
		usage: "deletecommand [commandname]",
		examples: ["deletecommand ping", "deletecommand test"],
		func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			var commandPrefix = amazejs.commandPrefix(serverID);

			allCommands = JSON.parse(fs.readFileSync("configfiles/commands.json"));
			var allcmd = allCommands.commands["server" + serverID];

			if(!argsm[1])
			{
				var createdCommands;
				var first = 0;

				for(var i in allCommands.commands["server" + serverID])
				{
					if(first === 0)
						createdCommands = "`" + allcmd[i].commandname + "`";
					else
						createdCommands += ", `" + allcmd[i].commandname + "`";

					first = 1;
				}

				if(createdCommands === undefined) createdCommands = "none";

				amazejs.sendWrong(context.channelID, context.userID,
						"Syntax: `" + commandPrefix + "deletecommand` `commandname`\n" +
						"`commandname`: The commandname goes here \n" +
						"Example: `" + commandPrefix + "deletecommand ping`\n\n" +
						"The following commands can be deleted: \n" + createdCommands);
				return;
			}

			var args = argsm[1];
			args = args.trim().split(" ");
			var deleteCommand = 0;
			var commandName = args[0];
			args.splice(0,1);
			var replyMessage = args.join(' ');

			for(var c in allCommands.commands["server" + serverID])
			{
				if(deleteCommand === 1)
					break;

				if(allcmd[c].commandname == commandName) deleteCommand = 1;
			}

			if(deleteCommand == 1)
			{
				delete allCommands.commands["server" + serverID][commandName];
				jsonfile.writeFileSync("configfiles/commands.json", allCommands);
				reply("<@" + context.userID + ">, the command `" + commandName + "` has been deleted.");
			}
			else
			{
				reply("<@" + context.userID + ">, the command `" + commandName + "` does not exist.");
			}
		}
	},
	addinline: {
		permission: "admin.inline",
		description: "Creates a new inline text command.",
		usage: "addinline [commandname] [text you want to show]",
		examples: ["addinline ping pong", "addinline test This is a test"],
		func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			var commandPrefix = amazejs.commandPrefix(serverID);

			allCommands = JSON.parse(fs.readFileSync("configfiles/commands.json"));
			var allcmd = allCommands.inline["server" + serverID];

			if(!argsm[1])
			{
				var createdCommands;
				var first = 0;

				for(var i in allCommands.inline["server" + serverID])
				{
					if(first === 0)
						createdCommands = "`" + allcmd[i].inlinecommand + "`";
					else
						createdCommands += ", `" + allcmd[i].inlinecommand + "`";

					first = 1;
				}

				if(createdCommands === undefined) createdCommands = "none";

				amazejs.sendWrong(context.channelID, context.userID,
						"Syntax: `" + commandPrefix + "addinline` `inlinecommand` `reply message`\n" +
						"`inlinecommand`: The text that the user has to type to fire this goes here\n" +
						"`reply message`: The message that the bot will reply\n" +
						"Example: `" + commandPrefix + "addinline ping pong!`\n\n" +
						"The following inlinecommands been created already: \n" + createdCommands);
				return;
			}
			var args = argsm[1];
			args = args.trim().split(" ");
			var makeCommand = 1;
			var commandName = args[0];
			args.splice(0,1);
			var replyMessage = args.join(' ');

			for(var c in allcmd)
			{
				if(makeCommand === 0)
					break;

				if(allcmd[c].inlinecommand == commandName) makeCommand = 0;
			}

			if(makeCommand == 1)
			{
				if(!allCommands.inline.hasOwnProperty("server" + serverID)) {
					allCommands.inline["server" + serverID] = JSON.parse("{}");
				}

				allCommands.inline["server" + serverID][commandName] = {"inlinecommand": commandName, "message": replyMessage};
				jsonfile.writeFileSync("configfiles/commands.json", allCommands);
				reply("<@" + context.userID + ">, succesfully created the inlinecommand `" + commandName + "`. ");
			}
			else
			{
				reply("<@" + context.userID + ">, the inlinecommand `" + commandName + "` already exists. Pick a different inlinecommand.");
			}
		}
	},
	changeinline: {
		permission: "admin.inline",
		description: "Changes an already existing inline text command.",
		usage: "changeinline [commandname] [text you want to show]",
		examples: ["changeinline ping pong", "changeinline test This is a test"],
		func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			var commandPrefix = amazejs.commandPrefix(serverID);

			allCommands = JSON.parse(fs.readFileSync("configfiles/commands.json"));
			var allcmd = allCommands.inline["server" + serverID];

			if(!argsm[1])
			{
				var createdCommands;
				var first = 0;

				for(var i in allCommands.inline["server" + serverID])
				{
					if(first === 0)
						createdCommands = "`" + allcmd[i].inlinecommand + "`";
					else
						createdCommands += ", `" + allcmd[i].inlinecommand + "`";

					first = 1;
				}

				if(createdCommands === undefined) createdCommands = "none";

				amazejs.sendWrong(context.channelID, context.userID,
						"Syntax: `" + commandPrefix + "changeinline` `inlinecommand` `reply message`\n" +
						"`inlinecommand`: The text that the user has to type to fire this goes here\n" +
						"`reply message`: The message that the bot will reply\n" +
						"Example: `" + commandPrefix + "changeinline ping no more pong!`\n\n" +
						"The following inlinecommands can be changed: \n" + createdCommands);
				return;
			}

			var args = argsm[1];
			args = args.trim().split(" ");
			var changeCommand = 0;
			var commandName = args[0];
			args.splice(0,1);
			var replyMessage = args.join(' ');

			for(var c in allCommands.inline["server" + serverID])
			{
				if(changeCommand === 1)
					break;

				if(allcmd[c].inlinecommand == commandName) changeCommand = 1;
			}

			if(changeCommand == 1)
			{
				allCommands.inline["server" + serverID][commandName] = {"inlinecommand": commandName, "message": replyMessage};
				jsonfile.writeFileSync("configfiles/commands.json", allCommands);
				reply("<@" + context.userID + ">, the inlinecommand `" + commandName + "` has been changed.");
			}
			else
			{
				reply("<@" + context.userID + ">, the inlinecommand `" + commandName + "` does not exist.");
			}
		}
	},
	deleteinline: {
		permission: "admin.inline",
		description: "Deletes an already existing inline text command.",
		usage: "deleteinline [commandname]",
		examples: ["deleteinline ping", "deleteinline test"],
		func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			var commandPrefix = amazejs.commandPrefix(serverID);

			allCommands = JSON.parse(fs.readFileSync("configfiles/commands.json"));
			var allcmd = allCommands.inline["server" + serverID];

			if(!argsm[1])
			{
				var createdCommands;
				var first = 0;

				for(var i in allCommands.inline["server" + serverID])
				{
					if(first === 0)
						createdCommands = "`" + allcmd[i].inlinecommand + "`";
					else
						createdCommands += ", `" + allcmd[i].inlinecommand + "`";

					first = 1;
				}

				if(createdCommands === undefined) createdCommands = "none";

				amazejs.sendWrong(context.channelID, context.userID,
						"Syntax: `" + commandPrefix + "deletecommand` `inlinecommand`\n" +
						"`inlinecommand`: The inlinecommand goes here \n" +
						"Example: `" + commandPrefix + "deleteinline ping`\n\n" +
						"The following inlinecommands can be deleted: \n" + createdCommands);
				return;
			}

			var args = argsm[1];
			args = args.trim().split(" ");
			var deleteCommand = 0;
			var commandName = args[0];
			args.splice(0,1);
			var replyMessage = args.join(' ');

			for(var c in allCommands.inline["server" + serverID])
			{
				if(deleteCommand === 1)
					break;

				if(allcmd[c].inlinecommand == commandName) deleteCommand = 1;
			}

			if(deleteCommand == 1)
			{
				delete allCommands.inline["server" + serverID][commandName];
				jsonfile.writeFileSync("configfiles/commands.json", allCommands);
				reply("<@" + context.userID + ">, the inlinecommand `" + commandName + "` has been deleted.");
			}
			else
			{
				reply("<@" + context.userID + ">, the inlinecommand `" + commandName + "` does not exist.");
			}
		}
	},
	permission: {
		permission: "admin.permission",
		description: "Shows all the permission tags from every single command.",
		usage: "permission",
		examples: ["permission"],
		func: function(args, context, reply) {
			var cmdsArr = amazejs.getCommands();
			var finalString;
			var spacing = 15;
			var finalStringCount = 0;

			for(var cmd in cmdsArr)
			{
				addspacing = spacing - cmd.length;
				spaces = "";

				for(i = 0; i <= addspacing; i++)
					spaces += " ";

				if(finalString[finalStringCount].length >= 1000) {
					finalString[finalStringCount + 1] += "Command: " + cmd + spaces + " | Permission: " + cmdsArr[cmd].permission + "\n";

					finalStringCount ++;
				}
				else {
					finalString[finalStringCount] += "Command: " + cmd + spaces + " | Permission: " + cmdsArr[cmd].permission + "\n";
				}
			}

			console.log(finalString);

			// reply("**All commands and permissions (Potentional long list):** \nHeads up: The commands with the prefix `axs` generally can't be used outside of the AxS server. \n" + "```" + finalString + "```");
		}
	},
	addperm: {
		permission: "admin.permission",
		description: "Add a permission tag to a certain user.",
		usage: "addperm [@mention] [permission]",
		examples: ["addperm @Wesley *", "addperm @Wesley misc.*", "addperm @Wesley misc.stats"],
		func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			var commandPrefix = amazejs.commandPrefix(serverID);

			if(!argsm[1])
			{
				amazejs.sendWrong(context.channelID, context.userID,
						"Syntax: `" + commandPrefix + "addperm` `@mention` `permission`\n" +
						"`@mention`: mention the user you want to give permission to \n" +
						"`permission`: The permission you want to give to the user, check `!permission` for all permissions\n" +
						"Example: `" + commandPrefix + "addperm @wesley admin.setperm`\n\n");
				return;
			}

			var args = argsm[1];
			args = args.trim().split(" ");

			if(args[0][0] != '<' && args[0][1] != '@' && args[0][2] != '!')
			{
				amazejs.sendWrong(context.channelID, context.userID,
					"Invalid user, please try again.");
					return;
			}
			else
			{
				args[0] = args[0].replace(/<@/g, "");
				args[0] = args[0].replace(/!/g, "");
				args[0] = args[0].replace(/>/g, "");
			}

			if(args.length != 2)
			{
				amazejs.sendWrong(context.channelID, context.userID,
					"Invalid amount of parameters. This command accepts exactly 2 parameters.");
				return;
			}

			var allPermission = JSON.parse(fs.readFileSync("configfiles/permissions.json"));

			if(!allPermission.hasOwnProperty("server" + serverID)) {
				// server doesn't exists in permission file
				allPermission["server" + serverID] = {};
				allPermission["server" + serverID]["user" + args[0]] = [args[1]];

				jsonfile.writeFileSync("configfiles/permissions.json", allPermission);
				amazejs.reloadPermissions();

				reply("<@" + context.userID + ">, succesfully added the permission `" + args[1] + "` to <@" + args[0] + ">.");
				return;
			}
			else {
				// server exists in permission file

				if(allPermission["server" + serverID].hasOwnProperty("user" + args[0])) {
					// user exists
					var permissionExist = 0;

					for(var i in allPermission["server" + serverID]["user" + args[0]]) {
						if(allPermission["server" + serverID]["user" + args[0]][i] == args[1]) {
							permissionExist = 1;
							break;
						}
					}

					if(permissionExist !== 0) {
						// permission exists
						reply("<@" + context.userID + ">, this user already had the permission `" + args[1] + "`.");
					}
					else {
						// permission doesn't exist
						allPermission["server" + serverID]["user" + args[0]].push(args[1]);
						jsonfile.writeFileSync("configfiles/permissions.json", allPermission);
						amazejs.reloadPermissions();

						reply("<@" + context.userID + ">, succesfully added the permission `" + args[1] + "` to <@" + args[0] + ">.");
						return;
					}
				}
				else {
					// user doesn't exist > permission doesn't exist
					allPermission["server" + serverID]["user" + args[0]] = [args[1]];
					jsonfile.writeFileSync("configfiles/permissions.json", allPermission);
					amazejs.reloadPermissions();

					reply("<@" + context.userID + ">, succesfully added the permission `" + args[1] + "` to <@" + args[0] + ">.");
					return;
				}
			}
		}
	},
	removeperm: {
		permission: "admin.permission",
		description: "Removes a permission tag from an user.",
		usage: "removeperm [@mention] [permission]",
		examples: ["removeperm @Wesley *", "removeperm @Wesley misc.*" ,"removeperm @Wesley misc.stats"],
		func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			var commandPrefix = amazejs.commandPrefix(serverID);

			if(!argsm[1])
			{
				amazejs.sendWrong(context.channelID, context.userID,
						"Syntax: `" + commandPrefix + "removeperm` `@mention` `permission`\n" +
						"`@mention`: mention the user you want to remove permission from \n" +
						"`permission`: The permission you want to remove from the user, check `" + commandPrefix + "permission` for all permissions\n" +
						"Example: `" + commandPrefix + "removeperm @wesley admin.setperm`\n\n");
				return;
			}

			var args = argsm[1];
			args = args.trim().split(" ");

			if(args[0][0] != '<' && args[0][1] != '@' && args[0][2] != '!')
			{
				amazejs.sendWrong(context.channelID, context.userID,
					"Invalid user, please try again.");
					return;
			}
			else
			{
				args[0] = args[0].replace(/<@/g, "");
				args[0] = args[0].replace(/!/g, "");
				args[0] = args[0].replace(/>/g, "");
			}

			if(args.length != 2)
			{
				amazejs.sendWrong(context.channelID, context.userID,
					"Invalid amount of parameters. This command accepts exactly 2 parameters.");
				return;
			}

			var allPermission = JSON.parse(fs.readFileSync("configfiles/permissions.json"));
			var permissionExist = 0;

			if(allPermission["server" + serverID]["user" + args[0]] !== null ||
				allPermission["server" + serverID]["user" + args[0]] !== undefined) {
					for(var i in allPermission["server" + serverID]["user" + args[0]]) {
						if(allPermission["server" + serverID]["user" + args[0]][i] == args[1]) {
							permissionExist = 1;
							break;
						}
					}
			}

			if(permissionExist) {
				for(var j = 0; j < allPermission["server" + serverID]["user" + args[0]].length; j ++) {
					console.log(allPermission["server" + serverID]["user" + args[0]][j]);
					if(allPermission["server" + serverID]["user" + args[0]][j] == args[1])
						allPermission["server" + serverID]["user" + args[0]].splice(j, 1);
				}

				jsonfile.writeFileSync("configfiles/permissions.json", allPermission);
				amazejs.reloadPermissions();

				reply("<@" + context.userID + ">, succesfully removed the permission `" + args[1] + "` from <@" + args[0] + ">.");
				return;
			}
			else {
				// permission doesn't exists, give error
				reply("<@" + context.userID + ">, this user doesn't have the permission `" + args[1] + "`.");
			}
		}
	},
	disable: {
		permission: "admin.commandpermission",
		description: "Disable a command from this server.",
		usage: "disable [commandname]",
		examples: ["disable help", "disable stats"],
		func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			var commandPrefix = amazejs.commandPrefix(serverID);

			if(!argsm[1]) {
				amazejs.sendWrong(context.channelID, context.userID,
						"Syntax: `" + commandPrefix + "disable` `commandname`\n" +
						"`commandname`: this will be the command that you will disable. This is SERVER-WIDE, meaning you can **not** use it in the server anymore until you enable it again. \n" +
						"Example: `" + commandPrefix + "disable clear`\n\n");
				return;
			}

			var blacklist = JSON.parse(fs.readFileSync("configfiles/blacklist.json"));

			var args = argsm[1];
			args = args.trim().split(" ");

			if(args[0] == "enable" || args[0] == "disable" || args[0] == "enablechannel" || args[0] == "disablechannel") {
				reply("<@" + context.userID + ">, you can't disable this command. ");
				return;
			}

			if(blacklist.hasOwnProperty("server" + serverID)) {
				blacklist["server" + serverID].disabledcommands.push(args[0]);
				jsonfile.writeFileSync("configfiles/blacklist.json", blacklist);

				reply("<@" + context.userID + ">, succesfully disabled the command `" + args[0] + "` server-wide. ");
			}
			else {
				blacklist["server" + serverID] = {};
				blacklist["server" + serverID].nocommandsinchannel = [];
				blacklist["server" + serverID].disabledcommands = [];
				blacklist["server" + serverID].disabledcommands.push(args[0]);
				jsonfile.writeFileSync("configfiles/blacklist.json", blacklist);

				reply("<@" + context.userID + ">, succesfully disabled the command `" + args[0] + "` server-wide. ");
			}
		}
	},
	enable: {
		permission: "admin.commandpermission",
		description: "Enables a command that has been disabled on this server.",
		usage: "enable [commandname]",
		examples: ["enable help", "enable stats"],
		func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			var commandPrefix = amazejs.commandPrefix(serverID);

			if(!argsm[1])
			{
				amazejs.sendWrong(context.channelID, context.userID,
						"Syntax: `" + commandPrefix + "enable` `commandname`\n" +
						"`commandname`: this will be the command that you will enable. \n" +
						"Example: `" + commandPrefix + "enable clear`\n\n");
				return;
			}

			var blacklist = JSON.parse(fs.readFileSync("configfiles/blacklist.json"));

			var args = argsm[1];
			args = args.trim().split(" ");

			if(blacklist.hasOwnProperty("server" + serverID)) {
				for(var i in blacklist["server" + serverID].disabledcommands) {
					if(blacklist["server" + serverID].disabledcommands[i] == args[0]) {
						blacklist["server" + serverID].disabledcommands.splice(i, 1);
						jsonfile.writeFileSync("configfiles/blacklist.json", blacklist);

						reply("<@" + context.userID + ">, succesfully enabled the command `" + args[0] + "` server-wide. ");
						return;
					}
				}

				reply("<@" + context.userID + ">, the command `" + args[0] + "` isn't disabled on this server. ");
			}
			else {
				reply("<@" + context.userID + ">, there are no commands disabled To disable a command, use the command `" + commandPrefix + "disable`.");
			}
		}
	},
	disablechannel: {
		permission: "admin.commandpermission",
		description: "Prevent commands from being used in this channel.",
		usage: "disablechannel confirm",
		examples: ["disable confirm"],
		func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			var commandPrefix = amazejs.commandPrefix(serverID);

			if(argsm[1] != "confirm")
			{
				amazejs.sendWrong(context.channelID, context.userID,
						"You forgot to confirm the action. \n" +
						"Use the following command: `" + commandPrefix + "disablechannel confirm`. This will disable **all** commands from being used in this channel.");
				return;
			}

			var blacklist = JSON.parse(fs.readFileSync("configfiles/blacklist.json"));

			if(blacklist.hasOwnProperty("server" + serverID)) {
				blacklist["server" + serverID].nocommandsinchannel.push(context.channelID);
				jsonfile.writeFileSync("configfiles/blacklist.json", blacklist);

				reply("<@" + context.userID + ">, succesfully disabled the usage of commands in this channel.");
			}
			else {
				blacklist["server" + serverID] = {};
				blacklist["server" + serverID].nocommandsinchannel = [];
				blacklist["server" + serverID].disabledcommands = [];
				blacklist["server" + serverID].nocommandsinchannel.push(context.channelID);
				jsonfile.writeFileSync("configfiles/blacklist.json", blacklist);

				reply("<@" + context.userID + ">, succesfully disabled the usage of commands in this channel.");
			}
		}
	},
	enablechannel: {
		permission: "admin.commandpermission",
		description: "This will enable the usage of commands in this channel again.",
		usage: "enablechannel confirm",
		examples: ["enable channel confirm"],
		func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			var commandPrefix = amazejs.commandPrefix(serverID);

			if(argsm[1] != "confirm")
			{
				amazejs.sendWrong(context.channelID, context.userID,
						"You forgot to confirm the action. \n" +
						"Use the following command: `" + commandPrefix + "enablechannel confirm`. This will enable the usage of commands in this channel.");
				return;
			}

			var blacklist = JSON.parse(fs.readFileSync("configfiles/blacklist.json"));

			var args = argsm[1];
			args = args.trim().split(" ");

			if(blacklist.hasOwnProperty("server" + serverID)) {
				for(var i in blacklist["server" + serverID].nocommandsinchannel) {
					if(blacklist["server" + serverID].nocommandsinchannel[i] == context.channelID) {
						blacklist["server" + serverID].nocommandsinchannel.splice(i, 1);
						jsonfile.writeFileSync("configfiles/blacklist.json", blacklist);

						reply("<@" + context.userID + ">, succesfully enabled the usage of commands in this channel. ");
						return;
					}
				}

				reply("<@" + context.userID + ">, the usage of commands isn't disabled in this channel.");
			}
			else {
				reply("<@" + context.userID + ">, commands are allowed to be used in this channel. To disable commands from being used in this channel use `" + commandPrefix + "disablechannel`.");
			}
		}
	},
	welcome: {
		permission: "admin.welcome",
		description: "The bot will send a message when a new user joins this server when this is enabled.",
		usage: "welcome confirm",
		examples: ["welcome confirm"],
		func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			var commandPrefix = amazejs.commandPrefix(serverID);

			if(argsm[1] != "confirm") {
				amazejs.sendWrong(context.channelID, context.userID,
						"You forgot to confirm the action. \n" +
						"Use the following command: `" + commandPrefix + "welcome confirm`. This will enable a welcome message when a new user joins this server. \nThe message will be in **this** channel.");
				return;
			}

			var welcome = JSON.parse(fs.readFileSync("configfiles/welcomechannel.json"));

			if(welcome.hasOwnProperty("server" + serverID)) {
				welcome["server" + serverID].channelID = context.channelID;
				jsonfile.writeFileSync("configfiles/welcomechannel.json", welcome);

				reply("<@" + context.userID + ">, a message will now be sent when an user joins this server.");
				return;
			}
			else {
				welcome["server" + serverID] = {};
				welcome["server" + serverID].channelid = context.channelID;
				jsonfile.writeFileSync("configfiles/welcomechannel.json", welcome);

				reply("<@" + context.userID + ">, a message will now be sent when an user joins this server.");
				return;

			}
		}
	},
	nowelcome: {
		permission: "admin.welcome",
		description: "The bot will stop sending a message when a new user joins this server.",
		usage: "nowelcome confirm",
		examples: ["nowelcome confirm"],
		func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			var commandPrefix = amazejs.commandPrefix(serverID);

			if(argsm[1] != "confirm") {
				amazejs.sendWrong(context.channelID, context.userID,
						"You forgot to confirm the action. \n" +
						"Use the following command: `" + commandPrefix + "nowelcome confirm`. This will disable the welcome message when a new user joins this server.");
				return;
			}

			var welcome = JSON.parse(fs.readFileSync("configfiles/welcomechannel.json"));

			if(welcome.hasOwnProperty("server" + serverID)) {
				welcome["server" + serverID].channelID = "N/A";
				jsonfile.writeFileSync("configfiles/welcomechannel.json", welcome);

				reply("<@" + context.userID + ">, I will no longer send a message when a new user joins.");
				return;
			}
			else {
				reply("<@" + context.userID + ">, I'm not sending a message when a new user joins, to enable me use the command `" + commandPrefix + "welcome`.");
				return;
			}
		}
	},
	remindme: {
		permission: "admin.remindme",
		description: "The bot will send you a reminder in X amount of time specified by you.",
		usage: "remindme [number] [second(s)/minute(s)/hour(s)] [message]",
		examples: ["remindme 1 hour Reminder message", "remindme 2 minutes Reminder message", "remindme 15 hours Reminder message" ],
		func: function(argsm, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			var commandPrefix = amazejs.commandPrefix(serverID);

			if(!argsm[1])
			{
				reply("<@" + context.userID + ">, Usage: " + commandPrefix + "remindme `time` `amount` `message` \n" +
					"Example: `" + commandPrefix + "remindme 5 seconds hi im a big message` \n" +
					"`time` has to be a number` \n" +
					"`amount` can only contain: `second`, `seconds`, `minute`, `minutes`, `hour`, `hours`, `day`, `days`");
				return;
			}

			var args = argsm[1];
			args = args.trim().split(" ");

			var amount, time, message, finalTime;

			amount = args[0];
			time = args[1];
			args.splice(0, 2);

			if(!isNumeric(amount))
			{
				reply("You have to enter a number for the first argument");
				return;
			}

			if(time == "second" || time == "seconds")
			{
				finalTime = parseInt(amount) * (1000);
			}
			else if(time == "minute" || time == "minutes")
			{
				finalTime = parseInt(amount) * (1000 * 60);
			}
			else if(time == "hour" || time == "hours")
			{
				finalTime = parseInt(amount) * (1000 * 60 * 60);
			}
			else if(time == "day" || time == "days")
			{
				finalTime = parseInt(amount) * (1000 * 60 * 60 * 24);
			}
			else
			{
				reply("<@" + context.userID + ">, Second parameter can only contain: `second`, `seconds`, `minute`, `minutes`, `hour`, `hours`, `day`, `days`");
				return;
			}

			reply("<@" + context.userID + ">, will remind you in " + amount + " " + time + ". ");

			(function(context, args, finaltime){
				var argjoin = args.join(' ');

				setTimeout(function(){
					reply("<@" + context.userID + ">, **Reminder: **\n" + argjoin);
				}, finalTime);
			}(context, args, finalTime));
		}
	},
	setname: {
		permission: "admin.setname",
		description: "Will change the \"Now playing\" of the bot.",
		usage: "setname [text]",
		examples: ["setname", "setname HI IM WESLEY!"],
		func: function(args, context, reply) {
			var serverID = discord.channels[context.channelID].guild_id;
			var commandPrefix = amazejs.commandPrefix(serverID);

			if(!args[1])
			{
				amazejs.setGame("Type !help for help");
				reply("<@" + context.userID + "> has changed the bot's title back to default.");
				return;
			}

			if(args[1].length >= 12)
			{
				amazejs.sendWrong(context.channelID, context.userID,
					"The name can only be 12 characters long.");
				return;
			}

			amazejs.setGame(args[1]);
			reply("<@" + context.userID + "> has set the bot's title to `" + args[1] + "`");
		}
	},
	clear: {
		permission: "admin.clear",
		description: "Will clear the chat for an X amount of lines. ",
		usage: "clear [amount of lines]",
		examples: ["clear", "clear 50", "clear 100"],
        func: function(args, context, reply) {
			var discord = amazejs.getDiscord();
			var deleteLines = 50;

			if(args[1]) {
				if(isNumeric(args[1]) && args[1] <= 100) {
					deleteLines = args[1];
				}
				else {
					amazejs.sendWrong(context.channelID, context.userID,
							"The amount of lines you want to delete has to be numeric. ");
					return;
				}
			}

			discord.getMessages({
				channelID: context.channelID,
				limit: deleteLines
			}, function(error, messageArray) {
				var finalArray = [];
				for(var i in messageArray) {
					finalArray.push(messageArray[i].id);
				}

				// console.log(finalArray);

				discord.deleteMessages({
					channelID: context.channelID,
					messageIDs: finalArray
				}, function(error, response) {
					if(error) console.log(error);
					if(response) console.log(response);

					reply("Cleared " + messageArray.length + " messages.");
				});
			});
		}
	},
	reload: {
		description: "This will reload all plugins and permissions.",
		usage: "reload",
		examples: ["roll"],
		permission: "admin.reload",
        func: function(args, context, reply) {
            amazejs.reloadPlugins();
            amazejs.reloadPermissions();
            reply("**Reloaded permissions and plugins.**");
        }
	}
};

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}
