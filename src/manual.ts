import { action } from './action'

function debug(message: string) {
  console.log(message)
}
function getInput(name: string) {
  return process.env[name] || ''
}
function setOutput(type: string, message: string) {
  console.log('output', type, message)
}
function setFailed(message: string) {
  console.log('failure', message)
}
const context = {
  sha: process.env.sha,
  ref: process.env.ref,
}
async function main() {
  const props = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: 'ap-northeast-1',
    type: getInput('type'),
    bucket: getInput('bucketName'),
    functionName: getInput('function'),
    account: getInput('account').trim(),
    conclusion: getInput('conclusion'),
    sha: context.sha,
    ref: context.ref,
    debug,
  }

  try {
    const { typeDetail, canaries } = await action(props)

    setOutput('type', typeDetail)
    setOutput('canaries', canaries.join(','))
  } catch (error) {
    setFailed(error.message)
  }
}
main()
