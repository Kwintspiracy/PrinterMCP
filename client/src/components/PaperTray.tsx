import { useState } from 'react';
import { Box, Heading, VStack, HStack, Text, Button, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Select, Icon, Card, CardBody, useColorModeValue, Progress, Tooltip } from '@chakra-ui/react';
import { MdPrint } from 'react-icons/md';

interface PaperTrayProps {
  paper?: { count: number; capacity: number; size: string };
  onLoadPaper: (count: number, size?: string) => void;
  onSetPaperCount?: (count: number, size?: string) => void;
}

export default function PaperTray({ paper, onLoadPaper, onSetPaperCount }: PaperTrayProps) {
  const [count, setCount] = useState(50);
  const [size, setSize] = useState('A4');

  const paperPercentage = ((paper?.count || 0) / (paper?.capacity || 500)) * 100;
  const paperColor = paperPercentage < 20 ? 'red' : paperPercentage < 50 ? 'orange' : 'green';
  const iconColor = useColorModeValue('blue.500', 'blue.300');
  const statBg = useColorModeValue('gray.50', 'gray.700');

  return (
    <Card>
      <CardBody>
        <Heading size="md" mb={6} fontWeight="600" letterSpacing="-0.5px">
          Paper Tray
        </Heading>

        <VStack spacing={5}>
          <HStack justify="center" spacing={4} w="full" p={4} bg={statBg} borderRadius="lg">
            <Icon as={MdPrint} boxSize={16} color={iconColor} />
            <VStack align="start" spacing={1}>
              <Text fontSize="4xl" fontWeight="bold">
                {paper?.count || 0}
              </Text>
              <Text fontSize="sm" fontWeight="600" color={useColorModeValue('gray.600', 'gray.400')}>sheets available</Text>
              <Text fontSize="xs" color={useColorModeValue('gray.500', 'gray.500')}>
                of {paper?.capacity || 500} capacity
              </Text>
            </VStack>
          </HStack>

          <Box w="full">
            <HStack justify="space-between" mb={2}>
              <Text fontSize="sm" fontWeight="600">Paper Level</Text>
              <Text fontSize="sm" fontWeight="600" color={`${paperColor}.500`}>
                {paperPercentage.toFixed(0)}%
              </Text>
            </HStack>
            <Progress
              value={paperPercentage}
              size="md"
              colorScheme={paperColor}
              borderRadius="full"
              hasStripe
              aria-label={`Paper level: ${paperPercentage.toFixed(0)}%`}
            />
          </Box>

          <VStack w="full" spacing={3}>
            <HStack w="full" spacing={2}>
              <NumberInput
                size="md"
                min={0}
                max={500}
                value={count}
                onChange={(_, val) => setCount(val)}
                flex={1}
              >
                <NumberInputField placeholder="Sheets" />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <Select size="md" value={size} onChange={(e) => setSize(e.target.value)} flex={1}>
                <option value="A4">A4</option>
                <option value="A5">A5</option>
                <option value="Letter">Letter</option>
                <option value="Legal">Legal</option>
                <option value="A3">A3</option>
                <option value="4x6">4x6</option>
              </Select>
            </HStack>
            <HStack w="full" spacing={2}>
              <Tooltip label={`Load ${count} sheets of ${size} paper`} placement="top">
                <Button
                  flex={1}
                  colorScheme="blue"
                  onClick={() => onLoadPaper(count, size)}
                  aria-label={`Load ${count} sheets of ${size} paper`}
                >
                  Load Paper
                </Button>
              </Tooltip>
              {onSetPaperCount && (
                <Tooltip label="Set custom paper count" placement="top">
                  <Button
                    flex={1}
                    variant="outline"
                    onClick={() => onSetPaperCount(count, size)}
                    aria-label={`Set paper count to ${count}`}
                  >
                    Set Count
                  </Button>
                </Tooltip>
              )}
            </HStack>
          </VStack>
        </VStack>
      </CardBody>
    </Card>
  );
}
