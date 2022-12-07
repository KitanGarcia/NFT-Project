import { FC, MouseEventHandler, useCallback } from "react";
import {
  Button,
  Container,
  Heading,
  HStack,
  Text,
  VStack,
  Image,
} from "@chakra-ui/react";
import { ArrowForwardIcon } from "@chakra-ui/icons";

const Connected: FC = () => {
  return (
    <VStack spacing={10}>
      <Container>
        <VStack spacing={8}>
          <Heading
            color="white"
            as="h1"
            size="2xl"
            noOfLines={1}
            textAlign="center"
          >
            Welcome NASer.
          </Heading>
          <Text color="bodyText" fontSize="xl" textAlign="center">
            Each NASer is randomly generated and can be staked to receive
            <Text as="b"> $NAS</Text> Use your <Text as="b"> $NAS</Text> to
            upgrade your NASer and receive perks within the community!
          </Text>
        </VStack>
      </Container>

      <HStack spacing={10}>
        <Image src="avatar1.png" alt="" htmlWidth="300px" rounded="lg" />
        <Image src="avatar2.png" alt="" htmlWidth="300px" rounded="lg" />
        <Image src="avatar3.png" alt="" htmlWidth="300px" rounded="lg" />
        <Image src="avatar4.png" alt="" htmlWidth="300px" rounded="lg" />
      </HStack>
      <HStack spacing={10}>
        <Image src="avatar5.png" alt="" htmlWidth="300px" rounded="lg" />
        <Image src="avatar6.png" alt="" htmlWidth="300px" rounded="lg" />
        <Image src="avatar7.png" alt="" htmlWidth="300px" rounded="lg" />
      </HStack>

      <Button bgColor="accent" color="white" maxW="380px">
        <HStack>
          <Text>mint NASer</Text>
          <ArrowForwardIcon />
        </HStack>
      </Button>
    </VStack>
  );
};

export default Connected;
