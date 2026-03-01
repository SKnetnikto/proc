// probe.c
// Компилировать: clang --target=wasm32 -nostdlib -Wl,--no-entry -Wl,--export=run_test -Wl,--export=memory -Wl,--initial-memory=6553600 -O3 -o static/probe.wasm probe.c

// 1. Объявляем типы вручную (так как нет stdint.h)
typedef unsigned int uint32;
typedef unsigned long long uint64;
typedef unsigned char uint8;

// 2. Память экспортируется автоматически через флаг --export=memory
// Доступ к ней через указатель на 0
#define MEMORY_BASE 0

// 3. Функция теста (экспортируется через флаг --export=run_test)
uint64 run_test(uint32 buffer_size, uint32 stride, uint32 iterations) {
    uint32 num_nodes = (buffer_size / sizeof(uint32)) / stride - 2;
    
    if (num_nodes < 10) return 0;
    
    // Указатель на начало памяти WASM
    volatile uint32* buffer = (volatile uint32*)MEMORY_BASE;
    
    // Инициализация цепочки
    for (uint32 i = 0; i < num_nodes; i++) {
        buffer[i * stride] = ((i + 1) % num_nodes) * stride;
    }
    
    // Прогрев
    uint32 idx = 0;
    for (uint32 i = 0; i < 100; i++) {
        idx = buffer[idx];
    }
    
    // Основная работа (pointer chasing)
    for (uint32 iter = 0; iter < iterations; iter++) {
        for (uint32 i = 0; i < num_nodes; i++) {
            idx = buffer[idx];
        }
    }
    
    return (uint64)idx;
}
