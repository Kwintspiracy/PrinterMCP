import { Box, VStack, HStack, Text, Icon, Switch, useColorModeValue, FormControl, FormLabel } from '@chakra-ui/react';
import { FiSettings } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import MCPConfigHelper from './MCPConfigHelper';

export default function Settings() {
    const [askBeforeSwitch, setAskBeforeSwitch] = useState(() => {
        const saved = localStorage.getItem('ask-before-switch-printer');
        return saved === null ? true : saved === 'true';
    });

    const borderColor = useColorModeValue('borderLight.default', 'border.default');
    const cardBg = useColorModeValue('canvasLight.default', 'canvas.subtle');
    const headerBg = useColorModeValue('canvasLight.subtle', 'canvas.default');
    const mutedText = useColorModeValue('fgLight.muted', 'fg.muted');
    const codeBg = useColorModeValue('gray.100', 'gray.800');

    const saveAskBeforeSwitch = async (value: boolean) => {
        setAskBeforeSwitch(value);
        localStorage.setItem('ask-before-switch-printer', String(value));

        // Also save to server
        try {
            const apiBase = typeof window !== 'undefined' ? window.location.origin : '';
            await fetch(`${apiBase}/api/settings?type=user`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ askBeforeSwitch: value })
            });
        } catch (error) {
            console.warn('Could not save setting to server');
        }
    };

    return (
        <VStack spacing={6} align="stretch">
            {/* Global Printer Settings */}
            <Box border="1px solid" borderColor={borderColor} borderRadius="md" bg={cardBg} overflow="hidden">
                <Box px={4} py={3} borderBottom="1px solid" borderColor={borderColor} bg={headerBg}>
                    <HStack>
                        <Icon as={FiSettings} color="purple.500" boxSize={4} />
                        <Text fontWeight="bold" fontSize="md">Global Printer Settings</Text>
                    </HStack>
                    <Text fontSize="xs" color={mutedText} mt={1}>
                        Configure default behavior for printer selection
                    </Text>
                </Box>
                <Box p={4}>
                    <VStack spacing={4} align="stretch">
                        <HStack justify="space-between" align="center" p={3} bg={codeBg} borderRadius="md">
                            <VStack align="start" spacing={0}>
                                <Text fontSize="sm" fontWeight="medium">Ask Before Switching Printers</Text>
                                <Text fontSize="xs" color={mutedText}>
                                    Confirm when default printer is unavailable
                                </Text>
                            </VStack>
                            <Switch
                                isChecked={askBeforeSwitch}
                                onChange={(e) => saveAskBeforeSwitch(e.target.checked)}
                                colorScheme="green"
                            />
                        </HStack>
                    </VStack>
                </Box>
            </Box>

            {/* MCP Configuration */}
            <MCPConfigHelper />
        </VStack>
    );
}
