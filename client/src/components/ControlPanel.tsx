import {
  Box,
  HStack,
  VStack,
  Button,
  Text,
  useColorModeValue,
  Flex,
  Icon,
  ButtonGroup,
  Divider,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiPause,
  FiPlay,
  FiRefreshCw,
  FiPower,
  FiTool,
  FiTarget,
  FiSearch,
  FiFileText,
} from 'react-icons/fi';

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
  const borderColor = useColorModeValue('borderLight.default', 'border.default');
  const cardBg = useColorModeValue('canvasLight.default', 'canvas.subtle');
  const headerBg = useColorModeValue('canvasLight.subtle', 'canvas.default');
  const mutedText = useColorModeValue('fgLight.muted', 'fg.muted');
  const sectionBg = useColorModeValue('canvasLight.subtle', 'canvas.default');

  return (
    <Box
      border="1px solid"
      borderColor={borderColor}
      borderRadius="md"
      bg={cardBg}
      overflow="hidden"
    >
      {/* Header */}
      <Box px={4} py={3} borderBottom="1px solid" borderColor={borderColor} bg={headerBg}>
        <Text fontWeight="semibold" fontSize="sm">Printer Controls</Text>
      </Box>

      {/* Control Sections */}
      <Box p={4}>
        <VStack spacing={4} align="stretch">
          {/* Power Controls */}
          <Box>
            <Text fontSize="xs" fontWeight="semibold" color={mutedText} textTransform="uppercase" mb={2}>
              Power Controls
            </Text>
            <HStack spacing={2}>
              <ButtonGroup size="sm" isAttached variant="outline" flex={1}>
                <Tooltip label="Pause printing" placement="top">
                  <Button
                    flex={1}
                    onClick={props.onPause}
                    isDisabled={props.status === 'paused'}
                    leftIcon={<Icon as={FiPause} boxSize={4} />}
                    aria-label="Pause printer"
                  >
                    Pause
                  </Button>
                </Tooltip>
                <Tooltip label="Resume printing" placement="top">
                  <Button
                    flex={1}
                    onClick={props.onResume}
                    isDisabled={props.status !== 'paused'}
                    leftIcon={<Icon as={FiPlay} boxSize={4} />}
                    aria-label="Resume printer"
                  >
                    Resume
                  </Button>
                </Tooltip>
              </ButtonGroup>
            </HStack>
            <HStack spacing={2} mt={2}>
              <Tooltip label="Power cycle the printer (~15 seconds)" placement="top">
                <Button
                  flex={1}
                  size="sm"
                  variant="outline"
                  onClick={props.onPowerCycle}
                  leftIcon={<Icon as={FiRefreshCw} boxSize={4} />}
                  aria-label="Power cycle printer"
                >
                  Power Cycle
                </Button>
              </Tooltip>
              <Tooltip label="Reset to factory defaults" placement="top">
                <Button
                  flex={1}
                  size="sm"
                  variant="danger"
                  onClick={props.onReset}
                  leftIcon={<Icon as={FiPower} boxSize={4} />}
                  aria-label="Reset printer to factory defaults"
                >
                  Reset
                </Button>
              </Tooltip>
            </HStack>
          </Box>

          <Divider borderColor={borderColor} />

          {/* Maintenance Controls */}
          <Box>
            <Text fontSize="xs" fontWeight="semibold" color={mutedText} textTransform="uppercase" mb={2}>
              Maintenance
            </Text>
            <VStack spacing={2}>
              <HStack w="full" spacing={2}>
                <Tooltip label="Clean the print heads" placement="top">
                  <Button
                    flex={1}
                    size="sm"
                    variant="outline"
                    onClick={props.onCleanHeads}
                    leftIcon={<Icon as={FiTool} boxSize={4} />}
                    aria-label="Clean print heads"
                  >
                    Clean Heads
                  </Button>
                </Tooltip>
                <Tooltip label="Align the print heads" placement="top">
                  <Button
                    flex={1}
                    size="sm"
                    variant="outline"
                    onClick={props.onAlignHeads}
                    leftIcon={<Icon as={FiTarget} boxSize={4} />}
                    aria-label="Align print heads"
                  >
                    Align Heads
                  </Button>
                </Tooltip>
              </HStack>
              <HStack w="full" spacing={2}>
                <Tooltip label="Run nozzle check pattern" placement="top">
                  <Button
                    flex={1}
                    size="sm"
                    variant="outline"
                    onClick={props.onNozzleCheck}
                    leftIcon={<Icon as={FiSearch} boxSize={4} />}
                    aria-label="Run nozzle check"
                  >
                    Nozzle Check
                  </Button>
                </Tooltip>
                <Tooltip label="Clear paper jam" placement="top">
                  <Button
                    flex={1}
                    size="sm"
                    variant="outline"
                    onClick={props.onClearJam}
                    leftIcon={<Icon as={FiFileText} boxSize={4} />}
                    aria-label="Clear paper jam"
                  >
                    Clear Jam
                  </Button>
                </Tooltip>
              </HStack>
            </VStack>
          </Box>
        </VStack>
      </Box>

      {/* Status Footer */}
      <Box
        px={4}
        py={2}
        borderTop="1px solid"
        borderColor={borderColor}
        bg={headerBg}
      >
        <HStack justify="space-between">
          <Text fontSize="xs" color={mutedText}>
            Current Status
          </Text>
          <Text fontSize="xs" fontWeight="medium" textTransform="capitalize">
            {props.status || 'Unknown'}
          </Text>
        </HStack>
      </Box>
    </Box>
  );
}
