const program = require("commander");
const chalk = require("chalk");
const inquirer = require("inquirer");
const download = require("download-git-repo");
const exists = require("fs").existsSync;
const rm = require("rimraf").sync;
const path = require("path");
const home = require("user-home");
const logger = require("../lib/logger");
const { isLocalPath, getTemplatePath } = require("../lib/local-path");
const generate = require("../lib/generate");
const ora = require("ora");

program
  .usage("<template-name> [project-name]")
  .option("-c, --clone", "use git clone");
/**
 * Help.
 */
program.on("--help", () => {
  console.log("  示例:");
  console.log();
  console.log(chalk.gray("    # 使用模板创建项目"));
  console.log("    $ kgt init kg-vue-boilerplate my-project");
  console.log();
});

/**
 * Help.如果只输入命令本身也会返回帮助文档。
 */
function help() {
  program.parse(process.argv);
  if (program.args.length < 1) return program.help();
}
help();

/**
 * Settings.
 */
// 模板名是什么
let template = program.args[0];
// 项目名叫什么
const rawName = program.args[1];
// 是否在当前目录
const inPlace = !rawName || rawName === ".";
// 最终经过计算得到的项目名
const name = inPlace ? path.relative("../", process.cwd()) : rawName;
// 模板最终会下载到什么地方
const to = path.resolve(rawName || ".");
// 是否使用git clone来下载私有仓库
const clone = program.clone || false;
// 模板的暂存目录
const tmp = path.join(home, ".kgt-templates", template.replace(/[\/:]/g, "-"));

/**
 * Padding.
 */

console.log();
process.on("exit", () => {
  console.log();
});
// 询问用户是否是在当前目录下创建项目; 如果要存放的目录已经存在提示已存在
if (inPlace || exists(to)) {
  inquirer
    .prompt([
      {
        type: "confirm",
        message: inPlace ? "在当前目录创建项目？" : "目录已经存在，仍要继续？",
        name: "ok"
      }
    ])
    .then(answers => {
      if (answers.ok) {
        run();
      }
    })
    .catch(logger.fatal);
} else {
  run();
}

/**
 * Check, download and generate the project.
 */

function run() {
  // check if template is local 本地模板
  if (isLocalPath(template)) {
    const templatePath = getTemplatePath(template);
    if (exists(templatePath)) {
      generate(name, templatePath, to, err => {
        if (err) logger.fatal(err);
        console.log();
        logger.success('"%s" 创建成功.', name);
      });
    } else {
      logger.fatal('未找到本地模板 "%s" .', template);
    }
  } else {
    // 远程模板，需要先下载
    downloadAndGenerate(template);
  }
}

/**
 * 从模板仓库下载模板，并生成项目
 *
 * @param {String} template
 */
function downloadAndGenerate(template) {
  const spinner = ora("模板下载中，请稍等···");
  spinner.start();

  // 如果存在本地模板，先删除
  if (exists(tmp)) rm(tmp);
  download(template, tmp, { clone }, err => {
    spinner.stop();
    if (err) {
      logger.fatal("模板" + template + "下载失败" + ": " + err.message.trim());
    }
    generate(name, tmp, to, err => {
      if (err) logger.fatal(err);
      console.log();
      logger.success('"%s" 创建成功.', name);
    });
  });
}
