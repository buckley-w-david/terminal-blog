// TODO: probably should break this up into a few files

import { fileSystem } from "./filesystem.js";
import { absolute, parent, expand, tokenize } from "./utils.js";
import { commands } from "./commands.js";

const shell = document.getElementById("shell");
const entry = document.getElementById("entry");
const output = document.getElementById("history");

const entryLine = shell.querySelector(".entry-line");
const ps1 = shell.querySelector(".ps1");
const directory = shell.querySelector(".directory");

let currentDirectory = "/";
const history = [];
let historyCursor = 0;
const builtins = [ ...Object.keys(commands), "cd", "clear"];
const variables = { PWD: "/" };

const abs = (path) => absolute(currentDirectory, path);

const exec = (command) => {
  let stderr = undefined;
  let stdout = "";
  let status = 0;

  const argv = command.slice(1);
  const argc = argv.length;
  const env = { currentDirectory: currentDirectory };

  if (Object.keys(commands).includes(command[0])) {
    return commands[command[0]](argc, argv, env);
  }

  switch (command[0]) {
    case "":
      break;
    case "cd":
      //: cd {{{
      if (argv.length !== 1) stderr = "Too many args for cd command";
      else if (argv[0] == "..") {
        let target = parent(currentDirectory);

        if (Object.keys(fileSystem.dirs).includes(target)) {
          currentDirectory = target;
          variables.PWD = target;
          directory.textContent = target;
        } else {
          stderr = `cd: The directory "${target}" does not exist`;
          status = 1;
        }
      } else {
        let target = abs(argv[0]);

        if (Object.keys(fileSystem.dirs).includes(target)) {
          currentDirectory = target;
          variables.PWD = target;
          directory.textContent = target;
        } else {
          stderr = `cd: The directory "${target}" does not exist`;
          status = 1;
        }
      }
      //#: }}}
      break;
    default:
      //: script execution {{{
      if (
        command[0].substring(0, 2) == "./" &&
        fileSystem.executables.includes(abs(command[0]))
      ) {
        // TODO local scripts
        //#: }}}
      } else {
        stderr = `Unknown command: ${command[0]}`;
        status = 127;
      }
      break;
  }
  return {
    stdout: stdout,
    stderr: stderr,
    statusCode: status,
  };
};

const validate = (text) => {
  //: validate {{{
  const command = tokenize(text)[0];
  return (
    command === "" ||
    builtins.includes(command) ||
    (command[0] !== "/" && fileSystem.executables.includes(abs(command))) ||
    fileSystem.executables.includes(command)
  );
  //: }}}
};

// TODO autofocus entry
entry.addEventListener("keydown", (event) => {
  //: history {{{
  if (event.keyCode == 38) {
    if (historyCursor >= history.length) {
      return;
    }
    historyCursor += 1;
    entry.value = history[history.length - historyCursor];
    return;
  } else if (event.keyCode == 40) {
    if (historyCursor == 0) {
      return;
    }
    historyCursor -= 1;

    if (historyCursor == 0) {
      entry.value = "";
    } else {
      entry.value = history[history.length - historyCursor];
    }
    return;
    //: }}}
  } else if (event.keyCode !== 13) {
    return;
  }

  //: exec {{{
  entry.className = "valid";
  const command = entry.value;
  const ps1Clone = ps1.cloneNode(true);
  entry.value = "";

  const tokens = tokenize(expand(command));

  history.push(command);
  if (tokens[0] == "clear") {
    // special case to prevent clear line from ending up in the history afterwards
    // The need for this kinda implies my architechure sucks
    output.textContent = "";
  } else {
    let result = exec(tokens);

    const historyLine = document.createElement("div");
    historyLine.className = "entry-line";

    const historyCommand = document.createElement("p");
    historyCommand.textContent = command;
    historyLine.appendChild(ps1Clone);
    historyLine.appendChild(historyCommand);

    const item = document.createElement("div");
    item.className = `status-${result.statusCode}`;

    const resultPart = document.createElement("pre");
    if (result.stderr !== undefined) {
      resultPart.appendChild(document.createTextNode(result.stderr + "\n"));
    }
    resultPart.appendChild(document.createTextNode(result.stdout));
    item.appendChild(historyLine);
    item.appendChild(resultPart);
    output.appendChild(item);
  }
  //: }}}
});

entry.addEventListener("keyup", (event) => {
  if (validate(entry.value)) {
    entry.className = "valid";
  } else {
    entry.className = "invalid";
  }
});