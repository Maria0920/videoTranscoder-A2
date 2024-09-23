import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

// Your AWS region
const region = "ap-southeast-2";

// Create SSM Client
const ssmClient = new SSMClient({ region });

async function getParameter(name) {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: true, // Set to true if using SecureString
  });

  const response = await ssmClient.send(command);
  return response.Parameter.Value;
}

// Cognito client
const client = new CognitoIdentityProviderClient({ region });

// Function to handle user sign-up and log in
async function signUp(username, password, email) {
  console.log("Signing up user...");

  const clientId = await getParameter("n11794615-clientID"); // Fetch Client ID from Parameter Store

  const signUpCommand = new SignUpCommand({
    ClientId: clientId,
    Username: username,
    Password: password,
    UserAttributes: [{ Name: "email", Value: email }],
  });

  try {
    const signUpRes = await client.send(signUpCommand);
    console.log("Sign-up successful:", signUpRes);

    // After successful sign-up, log the user in automatically
    const loginRes = await login(username, password);
    console.log("Login successful:", loginRes);

    return { signUpRes, loginRes };
  } catch (err) {
    console.error("Error during sign-up:", err);
    // Handle common errors
    handleSignUpErrors(err);
    throw err;
  }
}

// Function to handle user login
async function login(username, password) {
  console.log("Logging in user...");

  const clientId = await getParameter("n11794615-clientID"); // Fetch Client ID from Parameter Store

  const initiateAuthCommand = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: clientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  });

  try {
    const authRes = await client.send(initiateAuthCommand);
    console.log("Login successful:", authRes);
    const accessToken = authRes.AuthenticationResult.AccessToken;
    localStorage.setItem("accessToken", accessToken); // Store the access token
    return authRes;
  } catch (err) {
    console.error("Error during login:", err);
    throw err;
  }
}

// Handle sign-up errors
function handleSignUpErrors(err) {
  switch (err.name) {
    case "UsernameExistsException":
      console.error("The username is already taken. Please choose another.");
      break;
    case "InvalidPasswordException":
      console.error("The password does not meet the security requirements.");
      break;
    case "InvalidParameterException":
      console.error(
        "Invalid parameters. Ensure the email and password are valid."
      );
      break;
    case "CodeDeliveryFailureException":
      console.error(
        "Failed to deliver confirmation code. Check your email service."
      );
      break;
    default:
      console.error(`Sign-up failed: ${err.message}`);
  }
}

// Example usage
const username = "exampleuser";
const password = "SecurePassword123!";
const email = "example@example.com";

// Call the sign-up function
signUp(username, password, email)
  .then(() => console.log("User signed up and logged in successfully!"))
  .catch((err) => console.error("Sign-up or login failed:", err));
