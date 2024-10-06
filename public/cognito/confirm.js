import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const region = "ap-southeast-2"; // Your AWS region

// Create SSM Client
const ssmClient = new SSMClient({ region });

async function getParameter(name) {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: true, // Set to true if you're using SecureString
  });

  const response = await ssmClient.send(command);
  return response.Parameter.Value;
}

async function confirmSignUp(username, confirmationCode) {
  console.log("Confirming sign-up");

  // Fetch Client ID from Parameter Store
  const clientId = await getParameter("n11794615-clientID");

  const client = new CognitoIdentityProviderClient({ region });

  const command = new ConfirmSignUpCommand({
    ClientId: clientId,
    Username: username,
    ConfirmationCode: confirmationCode,
  });

  try {
    const res = await client.send(command);
    console.log("Confirmation Response:", res);
    return res;
  } catch (err) {
    console.error("Error confirming sign-up:", err);
    throw err;
  }
}

// Example usage
const username = "exampleuser";
const confirmationCode = "123456"; // Code received in the email

confirmSignUp(username, confirmationCode);
