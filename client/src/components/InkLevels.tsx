import { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  useColorModeValue,
  Icon,
  Flex,
  Tooltip,
  IconButton,
} from '@chakra-ui/react';
import { FiDroplet, FiRefreshCw } from 'react-icons/fi';

interface InkLevelsProps {
  inkLevels?: {
    cyan: number;
    magenta: number;
    yellow: number;
    black: number;
  };
  inkStatus?: {
    depleted: string[];
    low: string[];
  };
  onRefill: (color: string) => void;
  onSetLevel: (color: string, level: number) => void;
}

const inkColors = [
  { name: 'cyan', label: 'C', fullLabel: 'Cyan', color: '#00b4d8' },
  { name: 'magenta', label: 'M', fullLabel: 'Magenta', color: '#e91e8c' },
  { name: 'yellow', label: 'Y', fullLabel: 'Yellow', color: '#ffc107' },
  { name: 'black', label: 'K', fullLabel: 'Black', color: '#6e7681' },
];

export default function InkLevels({ inkLevels, inkStatus, onRefill, onSetLevel }: InkLevelsProps) {
  const [pendingLevels, setPendingLevels] = useState<Record<string, number>>({});

  const borderColor = useColorModeValue('borderLight.default', 'border.default');
  const cardBg = useColorModeValue('canvasLight.default', 'canvas.subtle');
  const headerBg = useColorModeValue('canvasLight.subtle', 'canvas.default');
  const mutedText = useColorModeValue('fgLight.muted', 'fg.muted');
  const trackBg = useColorModeValue('canvasLight.inset', 'canvas.inset');

  const getStatusIndicator = (colorName: string, level: number) => {
    if (inkStatus?.depleted.includes(colorName) || level <= 0) {
      return { bg: 'danger.subtle', border: 'danger.muted', color: 'danger.fg' };
    }
    if (inkStatus?.low.includes(colorName) || level < 20) {
      return { bg: 'attention.subtle', border: 'attention.muted', color: 'attention.fg' };
    }
    return null;
  };

  const handleSliderChange = (colorName: string, value: number) => {
    setPendingLevels({ ...pendingLevels, [colorName]: value });
  };

  const handleSet = (colorName: string) => {
    const level = pendingLevels[colorName];
    if (level !== undefined) {
      onSetLevel(colorName, level);
      // Clear pending after set
      const newPending = { ...pendingLevels };
      delete newPending[colorName];
      setPendingLevels(newPending);
    }
  };

  const handleRefill = (colorName: string) => {
    onRefill(colorName);
    // Clear any pending level for this color
    const newPending = { ...pendingLevels };
    delete newPending[colorName];
    setPendingLevels(newPending);
  };

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
            <Icon as={FiDroplet} boxSize={4} color={mutedText} />
            <Text fontWeight="semibold" fontSize="sm">Ink Levels</Text>
          </HStack>
          <Tooltip label="Refill all cartridges to 100%">
            <Button
              size="xs"
              variant="outline"
              leftIcon={<Icon as={FiRefreshCw} boxSize={3} />}
              onClick={() => {
                inkColors.forEach(({ name }) => onRefill(name));
                setPendingLevels({});
              }}
            >
              Refill All
            </Button>
          </Tooltip>
        </Flex>
      </Box>

      {/* Ink Sliders - Direct interaction */}
      <Box p={4}>
        <VStack spacing={4} align="stretch">
          {inkColors.map(({ name, label, fullLabel, color }) => {
            const actualLevel = inkLevels?.[name as keyof typeof inkLevels] || 0;
            const displayLevel = pendingLevels[name] ?? actualLevel;
            const hasChange = pendingLevels[name] !== undefined && pendingLevels[name] !== actualLevel;
            const statusIndicator = getStatusIndicator(name, actualLevel);

            return (
              <Box key={name}>
                {/* Row: Label | Slider | Percentage | Set | Refill */}
                <HStack spacing={3} align="center">
                  {/* Color indicator + label */}
                  <Tooltip label={fullLabel}>
                    <HStack spacing={1.5} minW="50px">
                      <Box
                        w={3}
                        h={3}
                        borderRadius="full"
                        bg={color}
                        flexShrink={0}
                      />
                      <Text fontSize="sm" fontWeight="semibold" color={mutedText}>
                        {label}
                      </Text>
                    </HStack>
                  </Tooltip>

                  {/* Slider - The colored bar IS the slider */}
                  <Box flex={1} position="relative">
                    <Slider
                      value={displayLevel}
                      onChange={(val) => handleSliderChange(name, val)}
                      min={0}
                      max={100}
                      aria-label={`${fullLabel} ink level`}
                      focusThumbOnChange={false}
                    >
                      <SliderTrack
                        bg={trackBg}
                        h="12px"
                        borderRadius="md"
                        border="1px solid"
                        borderColor={statusIndicator ? statusIndicator.border : borderColor}
                      >
                        <SliderFilledTrack
                          bg={color}
                          borderRadius="md"
                          transition="width 0.1s"
                        />
                      </SliderTrack>
                      <SliderThumb
                        boxSize={5}
                        bg="white"
                        border="2px solid"
                        borderColor={color}
                        _focus={{ boxShadow: `0 0 0 3px ${color}40` }}
                      >
                        <Box w={1.5} h={1.5} borderRadius="full" bg={color} />
                      </SliderThumb>
                    </Slider>
                  </Box>

                  {/* Percentage display */}
                  <Text
                    fontSize="sm"
                    fontWeight="semibold"
                    fontFamily="mono"
                    minW="45px"
                    textAlign="right"
                    color={hasChange ? 'accent.fg' : undefined}
                  >
                    {displayLevel.toFixed(0)}%
                  </Text>

                  {/* Set button - only show when changed */}
                  <Button
                    size="xs"
                    variant={hasChange ? 'primary' : 'outline'}
                    onClick={() => handleSet(name)}
                    isDisabled={!hasChange}
                    minW="45px"
                  >
                    Set
                  </Button>

                  {/* Refill button */}
                  <Tooltip label={`Refill ${fullLabel} to 100%`}>
                    <IconButton
                      aria-label={`Refill ${fullLabel}`}
                      icon={<Icon as={FiRefreshCw} boxSize={3} />}
                      size="xs"
                      variant="ghost"
                      onClick={() => handleRefill(name)}
                      color={color}
                      _hover={{ bg: `${color}20` }}
                    />
                  </Tooltip>
                </HStack>

                {/* Low/Empty warning */}
                {statusIndicator && (
                  <Box
                    mt={1}
                    ml="54px"
                    px={2}
                    py={0.5}
                    borderRadius="sm"
                    bg={statusIndicator.bg}
                    display="inline-block"
                  >
                    <Text fontSize="xs" color={statusIndicator.color} fontWeight="medium">
                      {actualLevel <= 0 ? 'Empty - needs refill' : 'Low ink warning'}
                    </Text>
                  </Box>
                )}
              </Box>
            );
          })}
        </VStack>
      </Box>
    </Box>
  );
}
