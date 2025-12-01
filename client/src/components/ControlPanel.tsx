import { Box, Heading, SimpleGrid, Button, VStack, Card, CardBody, Divider, Text, useColorModeValue } from '@chakra-ui/react';

interface ControlPanelProps {
  status?: string;
  onPause: () => void;
  onResume: () => void;
  onPowerCycle: () => void;
  onReset: () => void;
  onCleanHeads: () => void;
  onAlignHeads: () => void;
  onNozzleCheck: () => void;
  onClearJam: () => void;
}

export default function ControlPanel(props: ControlPanelProps) {
  return (
    <Card>
      <CardBody>
        <Heading size="md" mb={6} fontWeight="600" letterSpacing="-0.5px">
          Controls
        </Heading>
        <VStack spacing={5} align="stretch">
          <Box>
            <Text fontSize="sm" fontWeight="600" mb={3} color={useColorModeValue('gray.700', 'gray.300')}>
              Printer Controls
            </Text>
            <SimpleGrid columns={2} spacing={3}>
              <Button
                size="md"
                onClick={props.onPause}
                isDisabled={props.status === 'paused'}
                leftIcon={<span>⏸️</span>}
                aria-label="Pause printer"
              >
                Pause
              </Button>
              <Button
                size="md"
                onClick={props.onResume}
                isDisabled={props.status !== 'paused'}
                leftIcon={<span>▶️</span>}
                aria-label="Resume printer"
              >
                Resume
              </Button>
              <Button
                size="md"
                onClick={props.onPowerCycle}
                leftIcon={<span>🔄</span>}
                aria-label="Power cycle printer"
              >
                Power Cycle
              </Button>
              <Button
                size="md"
                colorScheme="red"
                onClick={props.onReset}
                leftIcon={<span>🔴</span>}
                aria-label="Reset printer to factory defaults"
              >
                Reset
              </Button>
            </SimpleGrid>
          </Box>

          <Divider />

          <Box>
            <Text fontSize="sm" fontWeight="600" mb={3} color={useColorModeValue('gray.700', 'gray.300')}>
              Maintenance Operations
            </Text>
            <SimpleGrid columns={2} spacing={3}>
              <Button
                size="md"
                onClick={props.onCleanHeads}
                leftIcon={<span>🧹</span>}
                variant="outline"
                aria-label="Clean print heads"
              >
                Clean Heads
              </Button>
              <Button
                size="md"
                onClick={props.onAlignHeads}
                leftIcon={<span>📏</span>}
                variant="outline"
                aria-label="Align print heads"
              >
                Align Heads
              </Button>
              <Button
                size="md"
                onClick={props.onNozzleCheck}
                leftIcon={<span>🔍</span>}
                variant="outline"
                aria-label="Run nozzle check"
              >
                Nozzle Check
              </Button>
              <Button
                size="md"
                onClick={props.onClearJam}
                leftIcon={<span>📄</span>}
                variant="outline"
                aria-label="Clear paper jam"
              >
                Clear Jam
              </Button>
            </SimpleGrid>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
}
