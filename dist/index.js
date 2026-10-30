"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/index.ts
var index_exports = {};
__export(index_exports, {
  CommandHandler: () => CommandHandler
});
module.exports = __toCommonJS(index_exports);
var import_path2 = __toESM(require("path"));
var import_url2 = require("url");
var import_discord3 = require("discord.js");

// src/utils/getPaths.ts
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var CODE_FILE = /\.(js|cjs|mjs|ts)$/;
var isCodeFile = (name) => CODE_FILE.test(name) && !name.endsWith(".d.ts");
function getFilePaths(directory, nesting) {
  let filePaths = [];
  if (!directory) return filePaths;
  const files = import_fs.default.readdirSync(directory, { withFileTypes: true });
  for (const file of files) {
    const filePath = import_path.default.join(directory, file.name);
    if (file.isFile() && isCodeFile(file.name)) {
      filePaths.push(filePath);
    }
    if (nesting && file.isDirectory()) {
      filePaths = [...filePaths, ...getFilePaths(filePath, true)];
    }
  }
  return filePaths.sort();
}
function getFolderPaths(directory, nesting) {
  let folderPaths = [];
  if (!directory) return folderPaths;
  const folders = import_fs.default.readdirSync(directory, { withFileTypes: true });
  for (const folder of folders) {
    const folderPath = import_path.default.join(directory, folder.name);
    if (folder.isDirectory()) {
      folderPaths.push(folderPath);
      if (nesting) {
        folderPaths = [...folderPaths, ...getFolderPaths(folderPath, true)];
      }
    }
  }
  return folderPaths.sort();
}

// src/utils/buildCommandTree.ts
var import_url = require("url");
var import_discord = require("discord.js");
function buildCommandTree(commandsDir) {
  return __async(this, null, function* () {
    var _a, _c;
    const commandTree = [];
    if (!commandsDir) return [];
    const commandFilePaths = getFilePaths(commandsDir, true);
    for (const commandFilePath of commandFilePaths) {
      const imported = yield import((0, import_url.pathToFileURL)(commandFilePath).href);
      const mod = (_a = imported.default) != null ? _a : imported;
      let _b = mod, { data, run, subcommands, deleted } = _b, rest = __objRest(_b, ["data", "run", "subcommands", "deleted"]);
      if (!data) throw new Error(`File ${commandFilePath} must export "data".`);
      if (!data.name) throw new Error(`File ${commandFilePath} must have a command name.`);
      const isSlashCommand = ((_c = data.type) != null ? _c : import_discord.ApplicationCommandType.ChatInput) === import_discord.ApplicationCommandType.ChatInput;
      if (isSlashCommand && !data.description) throw new Error(`File ${commandFilePath} must have a command description.`);
      try {
        data = data.toJSON();
      } catch (error) {
      }
      if (subcommands) {
        if (run) throw new Error(`File ${commandFilePath} exports both "run" and "subcommands"; use one of them.`);
        checkSubcommands(commandFilePath, data, subcommands);
      } else if (!run) {
        throw new Error(`File ${commandFilePath} must export a "run" function or "subcommands".`);
      }
      commandTree.push(__spreadProps(__spreadValues(__spreadValues({}, data), rest), {
        deleted,
        run,
        subcommands
      }));
    }
    return commandTree;
  });
}
function subcommandsInData(data) {
  var _a, _b;
  const names = [];
  for (const option of (_a = data.options) != null ? _a : []) {
    if (option.type === import_discord.ApplicationCommandOptionType.Subcommand) names.push(option.name);
    if (option.type === import_discord.ApplicationCommandOptionType.SubcommandGroup) {
      for (const sub of (_b = option.options) != null ? _b : []) names.push(`${option.name} ${sub.name}`);
    }
  }
  return names;
}
function subcommandsExported(commandFilePath, subcommands) {
  const names = [];
  for (const [name, value] of Object.entries(subcommands)) {
    if (typeof value === "function") {
      names.push(name);
    } else if (value && typeof value === "object") {
      for (const [sub, func] of Object.entries(value)) {
        if (typeof func !== "function")
          throw new Error(`File ${commandFilePath}: subcommands.${name}.${sub} must be a function.`);
        names.push(`${name} ${sub}`);
      }
    } else {
      throw new Error(`File ${commandFilePath}: subcommands.${name} must be a function or a group of functions.`);
    }
  }
  return names;
}
function checkSubcommands(commandFilePath, data, subcommands) {
  const inData = subcommandsInData(data);
  const exported = subcommandsExported(commandFilePath, subcommands);
  const problems = [
    ...inData.filter((name) => !exported.includes(name)).map((name) => `"${name}" is in data but has no function`),
    ...exported.filter((name) => !inData.includes(name)).map((name) => `"${name}" has a function but isn't in data`)
  ];
  if (problems.length) {
    throw new Error(`File ${commandFilePath} has subcommands that don't match: ${problems.join("; ")}.`);
  }
}

// src/utils/registerCommands.ts
var import_discord2 = require("discord.js");

// src/utils/getAppCommands.ts
function getAppCommands(client, guildId) {
  return __async(this, null, function* () {
    let applicationCommands;
    if (guildId) {
      const guild = yield client.guilds.fetch(guildId);
      applicationCommands = guild.commands;
    } else {
      applicationCommands = yield client.application.commands;
    }
    yield applicationCommands.fetch();
    return applicationCommands;
  });
}

// src/utils/registerCommands.ts
var API_FIELDS = [
  "type",
  "name",
  "name_localizations",
  "description",
  "description_localizations",
  "options",
  "default_member_permissions",
  "nsfw",
  "contexts",
  "integration_types",
  "handler"
];
function apiCommand(command) {
  const api = {};
  for (const field of API_FIELDS) {
    if (command[field] !== void 0) api[field] = command[field];
  }
  return api;
}
var sameCommand = (existing, command) => {
  var _a;
  return existing.name === command.name && existing.type === ((_a = command.type) != null ? _a : import_discord2.ApplicationCommandType.ChatInput);
};
function isUnchanged(existing, command) {
  var _a, _b, _c;
  return existing.equals(
    __spreadProps(__spreadValues({}, command), {
      nsfw: (_a = command.nsfw) != null ? _a : false,
      contexts: (_b = command.contexts) != null ? _b : existing.contexts,
      integration_types: (_c = command.integration_types) != null ? _c : existing.integrationTypes
    }),
    true
  );
}
function registerCommands(_0) {
  return __async(this, arguments, function* ({
    client,
    commands: localCommands,
    testServer,
    logger
  }) {
    const log = logger != null ? logger : console;
    try {
      const applicationCommands = yield getAppCommands(client, testServer);
      const existing = [...applicationCommands.cache.values()];
      const commands = localCommands.filter((command) => !command.deleted).map(apiCommand);
      const isLocal = (current) => commands.some((command) => sameCommand(current, command));
      const changes = [];
      for (const command of commands) {
        const current = existing.find((candidate) => sameCommand(candidate, command));
        if (!current) changes.push(`\u2705 Registered command "${command.name}".`);
        else if (!isUnchanged(current, command)) changes.push(`\u{1F501} Edited command "${command.name}".`);
      }
      const kept = existing.filter(
        (current) => current.type === import_discord2.ApplicationCommandType.PrimaryEntryPoint && !isLocal(current)
      );
      for (const current of existing) {
        if (!kept.includes(current) && !isLocal(current)) changes.push(`\u{1F5D1} Removed command "${current.name}".`);
      }
      if (!changes.length) return;
      yield applicationCommands.set([...commands, ...kept]);
      for (const change of changes) log.info(change);
    } catch (error) {
      log.error(`Couldn't register commands: ${error}`);
    }
  });
}

// src/index.ts
var CommandHandler = class {
  constructor({
    client,
    commandsPath,
    eventsPath,
    validationsPath,
    testServer,
    logger
  }) {
    // keyed by type and name, since a context menu can share its name with a slash command
    this._commandsByKey = /* @__PURE__ */ new Map();
    if (!client)
      throw new Error('Property "client" is required when instantiating CommandHandler.');
    this._client = client;
    this._commandsPath = commandsPath;
    this._eventsPath = eventsPath;
    this._validationsPath = validationsPath;
    this._testServer = testServer;
    this._commands = [];
    this._validationFuncs = [];
    this._logger = logger;
    if (this._validationsPath && !commandsPath) {
      throw new Error(
        'Command validations are only available in the presence of a commands path. Either add "commandsPath" or remove "validationsPath"'
      );
    }
    if (this._commandsPath) {
      this._client.once("clientReady", () => __async(this, null, function* () {
        yield this._commandsInit();
        this._registerSlashCommands();
        this._validationsPath && (yield this._validationsInit());
        this._handleInteractions();
      }));
    }
    if (this._eventsPath) {
      this._eventsInit();
    }
  }
  _commandsInit() {
    return __async(this, null, function* () {
      let commands = yield buildCommandTree(this._commandsPath);
      this._commands = commands;
      this._commandsByKey = new Map(commands.map((command) => [commandKey(command.type, command.name), command]));
    });
  }
  get _log() {
    var _a;
    return (_a = this._logger) != null ? _a : console;
  }
  _registerSlashCommands() {
    registerCommands({
      client: this._client,
      commands: this._commands,
      testServer: this._testServer,
      logger: this._logger
    });
  }
  // The listeners go on right away, so an event fired before the files finish importing
  // waits for them instead of being missed. Each file is imported once.
  _eventsInit() {
    const eventPaths = getFolderPaths(this._eventsPath);
    for (const eventPath of eventPaths) {
      const eventName = import_path2.default.basename(eventPath);
      if (!eventName) continue;
      const eventFuncs = this._importEventFuncs(eventName, getFilePaths(eventPath, true));
      this._client.on(eventName, (...arg) => __async(this, null, function* () {
        for (const { file, eventFunc } of yield eventFuncs) {
          try {
            const cantRunEvent = yield eventFunc(...arg, this._client, this);
            if (cantRunEvent) break;
          } catch (error) {
            this._log.error(`Event "${eventName}" failed in ${file}: ${describe(error)}`);
          }
        }
      }));
    }
  }
  // Never rejects: a file that doesn't import is logged once and left out.
  _importEventFuncs(eventName, eventFuncPaths) {
    return __async(this, null, function* () {
      var _a;
      const eventFuncs = [];
      for (const eventFuncPath of eventFuncPaths) {
        const file = import_path2.default.basename(eventFuncPath);
        try {
          const imported = yield import((0, import_url2.pathToFileURL)(eventFuncPath).href);
          const eventFunc = (_a = imported.default) != null ? _a : imported;
          if (typeof eventFunc !== "function") throw new Error("it must export a function");
          eventFuncs.push({ file, eventFunc });
        } catch (error) {
          this._log.error(`Event "${eventName}" file ${file} didn't load, so it won't run: ${describe(error)}`);
        }
      }
      return eventFuncs;
    });
  }
  _validationsInit() {
    return __async(this, null, function* () {
      var _a;
      const validationFilePaths = getFilePaths(this._validationsPath);
      for (const validationFilePath of validationFilePaths) {
        const imported = yield import((0, import_url2.pathToFileURL)(validationFilePath).href);
        const validationFunc = (_a = imported.default) != null ? _a : imported;
        if (typeof validationFunc !== "function") {
          throw new Error(`Validation file ${validationFilePath} must export a function by default.`);
        }
        this._validationFuncs.push(validationFunc);
      }
    });
  }
  // Slash commands, context menus and autocomplete. A command that throws is logged
  // and nothing replies for it; replying is up to the command.
  _handleInteractions() {
    this._client.on("interactionCreate", (interaction) => __async(this, null, function* () {
      var _a;
      if (!interaction.isCommand() && !interaction.isAutocomplete()) return;
      const command = this._commandsByKey.get(commandKey(interaction.commandType, interaction.commandName));
      if (!command) return;
      const context = { interaction, client: this._client, handler: this };
      if (interaction.isAutocomplete()) {
        try {
          yield (_a = command.autocomplete) == null ? void 0 : _a.call(command, context);
        } catch (error) {
          this._log.error(`Autocomplete for "${command.name}" failed: ${describe(error)}`);
        }
        return;
      }
      try {
        for (const validationFunc of this._validationFuncs) {
          const cantRunCommand = yield validationFunc(interaction, command, this, this._client);
          if (cantRunCommand) return;
        }
      } catch (error) {
        this._log.error(`A validation failed for "${command.name}", so it didn't run: ${describe(error)}`);
        return;
      }
      const { run, name } = commandRun(command, interaction);
      if (!run) {
        this._log.warn(`Nothing to run for "${name}", it isn't in the command file anymore.`);
        return;
      }
      try {
        yield run(context);
      } catch (error) {
        this._log.error(`Command "${name}" failed: ${describe(error)}`);
      }
    }));
  }
  get commands() {
    return this._commands;
  }
};
function commandRun(command, interaction) {
  var _a;
  if (!command.subcommands) return { run: command.run, name: command.name };
  const options = interaction.options;
  const group = options.getSubcommandGroup(false);
  const subcommand = options.getSubcommand(false);
  const run = group ? (_a = command.subcommands[group]) == null ? void 0 : _a[subcommand != null ? subcommand : ""] : command.subcommands[subcommand != null ? subcommand : ""];
  const name = [command.name, group, subcommand].filter(Boolean).join(" ");
  return { run: typeof run === "function" ? run : void 0, name };
}
var commandKey = (type, name) => `${type != null ? type : import_discord3.ApplicationCommandType.ChatInput}:${name}`;
var describe = (error) => {
  var _a;
  return error instanceof Error ? (_a = error.stack) != null ? _a : error.message : String(error);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CommandHandler
});
