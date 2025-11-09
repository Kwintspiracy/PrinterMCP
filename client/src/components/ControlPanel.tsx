import { Box, Heading, SimpleGrid, Button, VStack } from '@chakra-ui/react';

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
    <Box bg="white" p={6} borderRadius="lg" shadow="sm">
      <Heading size="md" mb={4} color="brand.500">Controls</Heading>
      <VStack spacing={4}>
        <SimpleGrid columns={2} spacing={2} w="full">
          <Button size="sm" onClick={props.onPause} isDisabled={props.status === 'paused'}>⏸️ Pause</Button>
          <Button size="sm" onClick={props.onResume} isDisabled={props.status !== 'paused'}>▶️ Resume</Button>
          <Button size="sm" onClick={props.onPowerCycle}>🔄 Power Cycle</Button>
          <Button size="sm" colorScheme="red" onClick={props.onReset}>🔴 Reset</Button>
        </SimpleGrid>
        <Heading size="sm" alignSelf="start">Maintenance</Heading>
        <SimpleGrid columns={2} spacing={2} w="full">
          <Button size="sm" onClick={props.onCleanHeads}>🧹 Clean</Button>
          <Button size="sm" onClick={props.onAlignHeads}>📏 Align</Button>
          <Button size="sm" onClick={props.onNozzleCheck}>🔍 Check</Button>
          <Button size="sm" onClick={props.onClearJam}>📄 Clear Jam</Button>
        </SimpleGrid>
      </VStack>
    </Box>
  );
}
