import { useState } from 'react';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  Button,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Card,
  CardBody,
  useColorModeValue,
  CircularProgress,
  CircularProgressLabel,
  Tooltip,
  Icon
} from '@chakra-ui/react';
import { FiDroplet } from 'react-icons/fi';

interface InkLevelsProps {
  inkLevels?: {
    cyan: number;
    magenta: number;
    yellow: number;
    black: number;
  };
  onRefill: (color: string) => void;
  onSetLevel: (color: string, level: number) => void;
}

const inkColors = [
  { name: 'cyan', label: 'Cyan', color: 'cyan.500', darkColor: 'cyan.400' },
  { name: 'magenta', label: 'Magenta', color: 'pink.500', darkColor: 'pink.400' },
  { name: 'yellow', label: 'Yellow', color: 'yellow.500', darkColor: 'yellow.400' },
  { name: 'black', label: 'Black', color: 'gray.800', darkColor: 'gray.300' },
];

export default function InkLevels({ inkLevels, onRefill, onSetLevel }: InkLevelsProps) {
  const [customLevels, setCustomLevels] = useState<Record<string, number | undefined>>({});
  const sliderBg = useColorModeValue('gray.100', 'gray.700');

  return (
    <Card>
      <CardBody>
        <Heading size="md" mb={6} fontWeight="600" letterSpacing="-0.5px">
          Ink Levels
        </Heading>

        <VStack spacing={6}>
          {inkColors.map(({ name, label, color, darkColor }) => {
            const level = inkLevels?.[name as keyof typeof inkLevels] || 0;
            const displayColor = useColorModeValue(color, darkColor);
            const getColorScheme = (level: number) => {
              if (level < 15) return 'red';
              if (level < 30) return 'orange';
              return 'green';
            };

            return (
              <Box key={name} w="full">
                <HStack mb={3} justify="space-between">
                  <HStack spacing={3}>
                    <Tooltip label={`${label} ink cartridge`} placement="top">
                      <Box position="relative">
                        <CircularProgress
                          value={level}
                          size="50px"
                          color={displayColor}
                          trackColor={sliderBg}
                          thickness="8px"
                        >
                          <CircularProgressLabel fontSize="xs" fontWeight="bold">
                            {level.toFixed(0)}%
                          </CircularProgressLabel>
                        </CircularProgress>
                        <Icon
                          as={FiDroplet}
                          position="absolute"
                          top="50%"
                          left="50%"
                          transform="translate(-50%, -50%)"
                          color={displayColor}
                          boxSize={4}
                          opacity={0.3}
                        />
                      </Box>
                    </Tooltip>
                    <Box>
                      <Text fontWeight="600" fontSize="md">{label}</Text>
                      <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')}>
                        {level < 15 ? 'Low - Refill soon' : level < 30 ? 'Medium' : 'Good'}
                      </Text>
                    </Box>
                  </HStack>
                </HStack>

                <HStack spacing={2} w="full">
                  <Slider
                    aria-label={`${label} ink level slider`}
                    value={customLevels[name] ?? level}
                    onChange={(val) => setCustomLevels({ ...customLevels, [name]: val })}
                    min={0}
                    max={100}
                    flex={1}
                    focusThumbOnChange={false}
                  >
                    <SliderTrack bg={sliderBg} borderRadius="full">
                      <SliderFilledTrack bg={displayColor} />
                    </SliderTrack>
                    <SliderThumb boxSize={6} borderWidth={2} borderColor={displayColor} />
                  </Slider>
                  <Text fontSize="sm" fontWeight="600" minW="45px" textAlign="center">
                    {(customLevels[name] ?? level).toFixed(0)}%
                  </Text>
                  <Tooltip label="Apply custom level" placement="top">
                    <Button
                      size="sm"
                      onClick={() => {
                        const levelToSet = customLevels[name] ?? level;
                        onSetLevel(name, levelToSet);
                      }}
                      variant="outline"
                      aria-label={`Set ${label} ink to ${customLevels[name] ?? level}%`}
                    >
                      Set
                    </Button>
                  </Tooltip>
                  <Tooltip label="Refill to 100%" placement="top">
                    <Button
                      size="sm"
                      colorScheme="blue"
                      onClick={() => {
                        onRefill(name);
                        setCustomLevels({ ...customLevels, [name]: undefined });
                      }}
                      aria-label={`Refill ${label} ink to 100%`}
                    >
                      Refill
                    </Button>
                  </Tooltip>
                </HStack>
              </Box>
            );
          })}
        </VStack>
      </CardBody>
    </Card>
  );
}
