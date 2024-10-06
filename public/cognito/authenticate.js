import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AuthFlowType,
} from "@aws-sdk/client-cognito-identity-provider";
import { CognitoJwtVerifier } from "aws-jwt-verify";
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

async function setup() {
  // Fetch User Pool ID and Client ID from Parameter Store
  const userPoolId = await getParameter("n11794615-userpoolid");
  const clientId = await getParameter("n11794615-clientID");

  const accessVerifier = CognitoJwtVerifier.create({
    userPoolId: userPoolId,
    tokenUse: "access",
    clientId: clientId,
  });

  const idVerifier = CognitoJwtVerifier.create({
    userPoolId: userPoolId,
    tokenUse: "id",
    clientId: clientId,
  });

  return { accessVerifier, idVerifier, clientId };
}

async function authenticate(username, password) {
  console.log("Getting auth token");

  const { accessVerifier, idVerifier, clientId } = await setup();

  const client = new CognitoIdentityProviderClient({ region });

  const command = new InitiateAuthCommand({
    AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
    ClientId: clientId,
  });

  try {
    const res = await client.send(command);
    console.log("Authentication Result:", res);

    const accessToken = await accessVerifier.verify(
      res.AuthenticationResult.AccessToken
    );
    console.log("Access Token:", accessToken);

    const idToken = await idVerifier.verify(res.AuthenticationResult.IdToken);
    console.log("ID Token:", idToken);

    return res.AuthenticationResult; // Return tokens for further use
  } catch (err) {
    console.error("Error during authentication:", err);
    throw err;
  }
}

// Example usage
const username = "exampleuser";
const password = "SecurePassword123!";

authenticate(username, password);
