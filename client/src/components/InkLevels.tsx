import { useState } from 'react';
import { Box, Heading, VStack, HStack, Text, Button, Slider, SliderTrack, SliderFilledTrack, SliderThumb } from '@chakra-ui/react';

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
  { name: 'cyan', label: 'Cyan', color: 'cyan.500' },
  { name: 'magenta', label: 'Magenta', color: 'pink.500' },
  { name: 'yellow', label: 'Yellow', color: 'yellow.400' },
  { name: 'black', label: 'Black', color: 'gray.800' },
];

export default function InkLevels({ inkLevels, onRefill, onSetLevel }: InkLevelsProps) {
  const [customLevels, setCustomLevels] = useState<Record<string, number | undefined>>({});

  return (
    <Box bg="white" p={6} borderRadius="lg" shadow="sm">
      <Heading size="md" mb={4} color="brand.500">
        Ink Levels
      </Heading>
      
      <VStack spacing={4}>
        {inkColors.map(({ name, label, color }) => {
          const level = inkLevels?.[name as keyof typeof inkLevels] || 0;
          const colorScheme = level < 15 ? 'red' : level < 30 ? 'orange' : 'green';
          
          return (
            <Box key={name} w="full">
              <HStack mb={3} justify="space-between">
                <HStack>
                  <Box w={4} h={4} bg={color} borderRadius="sm" />
                  <Text fontWeight="semibold">{label}</Text>
                </HStack>
                <Text fontWeight="bold" color={level < 15 ? 'red.500' : level < 30 ? 'orange.500' : 'green.500'}>
                  {level.toFixed(1)}%
                </Text>
              </HStack>
              
              <HStack spacing={2} w="full">
                <Slider
                  aria-label={`${label} ink level`}
                  value={customLevels[name] ?? level}
                  onChange={(val) => setCustomLevels({ ...customLevels, [name]: val })}
                  min={0}
                  max={100}
                  flex={1}
                >
                  <SliderTrack>
                    <SliderFilledTrack bg={color} />
                  </SliderTrack>
                  <SliderThumb boxSize={5} />
                </Slider>
                <Text fontSize="sm" fontWeight="semibold" minW="45px">
                  {(customLevels[name] ?? level).toFixed(0)}%
                </Text>
                <Button 
                  size="sm" 
                  onClick={() => {
                    const levelToSet = customLevels[name] ?? level;
                    onSetLevel(name, levelToSet);
                  }}
                >
                  Set
                </Button>
                <Button size="sm" colorScheme="blue" onClick={() => {
                  onRefill(name);
                  setCustomLevels({ ...customLevels, [name]: undefined });
                }}>
                  100%
                </Button>
              </HStack>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
}
