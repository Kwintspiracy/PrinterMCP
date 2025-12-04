import { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Icon,
  useColorModeValue,
  Flex,
  Tooltip,
} from '@chakra-ui/react';
import { FiLayers, FiPlus } from 'react-icons/fi';

interface PaperTrayProps {
  paper?: { count: number; capacity: number; size: string };
  onLoadPaper: (count: number, size?: string) => void;
  onSetPaperCount?: (count: number, size?: string) => void;
}

export default function PaperTray({ paper, onLoadPaper, onSetPaperCount }: PaperTrayProps) {
  const [count, setCount] = useState(50);
  const [size, setSize] = useState('A4');

  const borderColor = useColorModeValue('borderLight.default', 'border.default');
  const cardBg = useColorModeValue('canvasLight.default', 'canvas.subtle');
  const headerBg = useColorModeValue('canvasLight.subtle', 'canvas.default');
  const mutedText = useColorModeValue('fgLight.muted', 'fg.muted');
  const trackBg = useColorModeValue('canvasLight.inset', 'canvas.inset');

  const paperCount = paper?.count || 0;
  const paperCapacity = paper?.capacity || 500;
  const paperPercentage = (paperCount / paperCapacity) * 100;

  const getStatusColor = () => {
    if (paperPercentage < 10) return 'danger';
    if (paperPercentage < 25) return 'attention';
    return 'success';
  };

  const statusColor = getStatusColor();

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
        <Flex justify="space-between" align="center">
          <HStack spacing={2}>
            <Icon as={FiLayers} boxSize={4} color={mutedText} />
            <Text fontWeight="semibold" fontSize="sm">Paper Tray</Text>
          </HStack>
          <Box
            px={2}
            py={0.5}
            borderRadius="full"
            bg={`${statusColor}.subtle`}
            border="1px solid"
            borderColor={`${statusColor}.muted`}
          >
            <Text fontSize="xs" fontWeight="medium" color={`${statusColor}.fg`}>
              {paper?.size || 'A4'}
            </Text>
          </Box>
        </Flex>
      </Box>

      {/* Paper Level Display */}
      <Box p={4}>
        <VStack spacing={4} align="stretch">
          {/* Count Display */}
          <Flex justify="space-between" align="baseline">
            <Text fontSize="3xl" fontWeight="bold" lineHeight={1}>
              {paperCount}
            </Text>
            <Text fontSize="sm" color={mutedText}>
              of {paperCapacity} sheets
            </Text>
          </Flex>

          {/* Progress Bar */}
          <Box>
            <Box
              h="8px"
              bg={trackBg}
              borderRadius="full"
              overflow="hidden"
            >
              <Box
                h="100%"
                w={`${paperPercentage}%`}
                bg={`${statusColor}.emphasis`}
                borderRadius="full"
                transition="width 0.3s ease"
              />
            </Box>
            <Flex justify="space-between" mt={1}>
              <Text fontSize="xs" color={mutedText}>
                {paperPercentage.toFixed(0)}% capacity
              </Text>
              <Text fontSize="xs" color={`${statusColor}.fg`} fontWeight="medium">
                {paperPercentage < 10 ? 'Refill needed' : paperPercentage < 25 ? 'Running low' : 'Good'}
              </Text>
            </Flex>
          </Box>

          {/* Load Paper Form */}
          <Box
            p={3}
            bg={headerBg}
            borderRadius="md"
            border="1px solid"
            borderColor={borderColor}
          >
            <Text fontSize="xs" fontWeight="semibold" color={mutedText} textTransform="uppercase" mb={2}>
              Load Paper
            </Text>
            <HStack spacing={2}>
              <NumberInput
                size="sm"
                min={1}
                max={500}
                value={count}
                onChange={(_, val) => setCount(val || 0)}
                flex={1}
              >
                <NumberInputField placeholder="Sheets" />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <Select
                size="sm"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                w="100px"
              >
                <option value="A4">A4</option>
                <option value="A5">A5</option>
                <option value="Letter">Letter</option>
                <option value="Legal">Legal</option>
                <option value="A3">A3</option>
                <option value="4x6">4x6</option>
              </Select>
            </HStack>
            <HStack spacing={2} mt={2}>
              <Tooltip label={`Add ${count} sheets of ${size} paper`}>
                <Button
                  flex={1}
                  size="sm"
                  variant="primary"
                  leftIcon={<Icon as={FiPlus} boxSize={4} />}
                  onClick={() => onLoadPaper(count, size)}
                  aria-label={`Load ${count} sheets of ${size} paper`}
                >
                  Load
                </Button>
              </Tooltip>
              {onSetPaperCount && (
                <Tooltip label="Set exact paper count">
                  <Button
                    flex={1}
                    size="sm"
                    variant="outline"
                    onClick={() => onSetPaperCount(count, size)}
                    aria-label={`Set paper count to ${count}`}
                  >
                    Set Count
                  </Button>
                </Tooltip>
              )}
            </HStack>
          </Box>
        </VStack>
      </Box>

      {/* Footer */}
      <Box px={4} py={2} borderTop="1px solid" borderColor={borderColor} bg={headerBg}>
        <HStack justify="space-between">
          <Text fontSize="xs" color={mutedText}>
            Paper Size
          </Text>
          <Text fontSize="xs" fontWeight="medium">
            {paper?.size || 'A4'}
          </Text>
        </HStack>
      </Box>
    </Box>
  );
}
