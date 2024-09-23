import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const region = "ap-southeast-2"; // Your AWS Region

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

// Function to handle user login
async function login(username, password) {
  console.log("Logging in with:", username); // Log the username

  const clientId = await getParameter("n11794615-clientID"); // Fetch Client ID from Parameter Store
  const client = new CognitoIdentityProviderClient({ region });

  const command = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: clientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  });

  try {
    const response = await client.send(command);
    console.log("Login successful:", response);

    const { AccessToken, IdToken, RefreshToken } =
      response.AuthenticationResult;
    storeTokens(AccessToken, IdToken, RefreshToken);

    console.log("Login completed without MFA");
    return response; // Return the response for further use
  } catch (err) {
    console.error("Login error:", err);
    handleLoginError(err);
    throw err; // Rethrow error if needed
  }
}

// Function to securely store the tokens (e.g., in localStorage or sessionStorage)
function storeTokens(accessToken, idToken, refreshToken) {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("idToken", idToken);
  localStorage.setItem("refreshToken", refreshToken);
  console.log("Tokens stored successfully:", {
    accessToken,
    idToken,
    refreshToken,
  });
}

// Function to handle different types of login errors
function handleLoginError(err) {
  console.error("Error details:", err);
  switch (err.name) {
    case "UserNotFoundException":
      console.error("The username does not exist.");
      break;
    case "NotAuthorizedException":
      console.error("The username or password is incorrect.");
      break;
    case "UserNotConfirmedException":
      console.error("The user is not confirmed. Please confirm your account.");
      break;
    case "PasswordResetRequiredException":
      console.error("Password reset is required.");
      break;
    case "InvalidParameterException":
      console.error("Invalid parameters. Check the input values.");
      break;
    default:
      console.error(`Unexpected error: ${err.message}`);
  }
}

// Example usage (optional)
const username = "exampleuser";
const password = "SecurePassword123!";

login(username, password)
  .then(() => console.log("User logged in successfully!"))
  .catch((err) => console.error("Login failed:", err));

export { login }; // Export the login function if needed in other files
