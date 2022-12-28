import {
  Button,
  Text,
  Image,
  VStack,
  Container,
  Heading,
} from "@chakra-ui/react";

export const StakeOptionsDisplay = ({ isStaking }: { isStaking: boolean }) => {
  return (
    <VStack
      bgColor="containerBg"
      borderRadius="20px"
      padding="20px 40px"
      spacing={5}
    >
      <Text
        bgColor="containerBgSecondary"
        padding="4px 8px"
        borderRadius="20px"
        color="bodyText"
        as="b"
        fontSize="sm"
      >
        {isStaking
          ? `STAKING ${daysStaked} DAY${daysStaked === 1 ? "" : "S"}`
          : "Ready TO STAKE"}
      </Text>
      <VStack spacing={-1}>
        <Text color="white" as="b" fontSize="4xl">
          {isStaking ? `${totalEarned} $NAS` : "$NAS"}
        </Text>
        <Text color="bodyText" as="b" fontSize="4xl">
          {isStaking ? `${claimable} $NAS earned` : "earn $NAS by staking"}
        </Text>
      </VStack>
      <Button
        onClick={isStaking ? handleClaim : handleStake}
        bgColor="buttonGreen"
        width="200px"
      >
        <Text as="b">{isStaking ? "claim $NAS" : "stake NASer"}</Text>
      </Button>
      {isStaking ? <Button onClick={handleUnstake}>unstake</Button> : null}
    </VStack>
  );
};
