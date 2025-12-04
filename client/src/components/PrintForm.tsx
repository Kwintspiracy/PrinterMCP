import { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Checkbox,
  Select,
  Button,
  Icon,
  useColorModeValue,
  Text,
  Flex,
} from '@chakra-ui/react';
import { FiPrinter, FiSend } from 'react-icons/fi';

interface PrintFormProps {
  onSubmit: (data: { documentName: string; pages: number; color: boolean; quality: string; paperSize: string }) => void;
}

export default function PrintForm({ onSubmit }: PrintFormProps) {
  const [documentName, setDocumentName] = useState('Test Document');
  const [pages, setPages] = useState(5);
  const [color, setColor] = useState(true);
  const [quality, setQuality] = useState('normal');
  const [paperSize, setPaperSize] = useState('A4');

  const borderColor = useColorModeValue('borderLight.default', 'border.default');
  const cardBg = useColorModeValue('canvasLight.default', 'canvas.subtle');
  const headerBg = useColorModeValue('canvasLight.subtle', 'canvas.default');
  const mutedText = useColorModeValue('fgLight.muted', 'fg.muted');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ documentName, pages, color, quality, paperSize });
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
        <HStack spacing={2}>
          <Icon as={FiPrinter} boxSize={4} color={mutedText} />
          <Text fontWeight="semibold" fontSize="sm">New Print Job</Text>
        </HStack>
      </Box>

      {/* Form */}
      <Box p={4}>
        <form onSubmit={handleSubmit}>
          <VStack spacing={4} align="stretch">
            {/* Document Name */}
            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="medium" mb={1}>
                Document Name
              </FormLabel>
              <Input
                size="sm"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Enter document name"
              />
            </FormControl>

            {/* Pages and Paper Size Row */}
            <HStack spacing={3} align="flex-end">
              <FormControl isRequired flex={1}>
                <FormLabel fontSize="sm" fontWeight="medium" mb={1}>
                  Pages
                </FormLabel>
                <NumberInput
                  size="sm"
                  min={1}
                  max={100}
                  value={pages}
                  onChange={(_, val) => setPages(val || 1)}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <FormControl isRequired flex={1}>
                <FormLabel fontSize="sm" fontWeight="medium" mb={1}>
                  Paper Size
                </FormLabel>
                <Select
                  size="sm"
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value)}
                >
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                  <option value="Letter">Letter</option>
                  <option value="Legal">Legal</option>
                  <option value="A3">A3</option>
                  <option value="4x6">4x6</option>
                </Select>
              </FormControl>
            </HStack>

            {/* Quality */}
            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="medium" mb={1}>
                Print Quality
              </FormLabel>
              <Select
                size="sm"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
              >
                <option value="draft">Draft - Fast, lower quality</option>
                <option value="normal">Normal - Balanced</option>
                <option value="high">High - Better quality</option>
                <option value="photo">Photo - Best quality</option>
              </Select>
            </FormControl>

            {/* Color Print Checkbox */}
            <Box
              p={3}
              bg={headerBg}
              borderRadius="md"
              border="1px solid"
              borderColor={borderColor}
            >
              <Checkbox
                isChecked={color}
                onChange={(e) => setColor(e.target.checked)}
                colorScheme="blue"
              >
                <Text fontSize="sm" fontWeight="medium">Color Print</Text>
                <Text fontSize="xs" color={mutedText}>
                  Uses cyan, magenta, yellow, and black ink
                </Text>
              </Checkbox>
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              w="full"
              leftIcon={<Icon as={FiSend} boxSize={4} />}
              aria-label="Submit print job"
            >
              Print Document
            </Button>
          </VStack>
        </form>
      </Box>

      {/* Footer */}
      <Box px={4} py={2} borderTop="1px solid" borderColor={borderColor} bg={headerBg}>
        <HStack justify="space-between">
          <Text fontSize="xs" color={mutedText}>
            Estimated ink usage
          </Text>
          <Text fontSize="xs" fontWeight="medium">
            {color ? 'Color' : 'Black only'} • {quality}
          </Text>
        </HStack>
      </Box>
    </Box>
  );
}
