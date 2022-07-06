import { getInput, setFailed, setOutput, debug } from "@actions/core";
import { context } from "@actions/github";
import { action } from "./action";

async function main() {
  const props = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: "ap-northeast-1",
    version: getInput("version"),
    type: getInput("type"),
    bucket: getInput("bucketName"),
    functionName: getInput("function"),
    account: getInput("account").trim(),
    conclusion: getInput("conclusion"),
    sha: context.sha,
    ref: context.ref,
    debug,
  };

  try {
    const { typeDetail, canaries } = await action(props);
    setOutput("type", typeDetail);
    setOutput("canaries", canaries.join(","));
  } catch (error) {
    setFailed(error.message);
  }
}
main();
