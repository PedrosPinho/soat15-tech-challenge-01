import { ItemEstoque } from '@domain/entities/item-estoque.entity';

function makeItem(overrides: Partial<{
  quantidadeDisponivel: number;
  quantidadeReservada: number;
  nivelMinimo: number;
  nivelMaximo: number;
}> = {}): ItemEstoque {
  return ItemEstoque.create({
    pecaId: 'peca-uuid-1',
    quantidadeDisponivel: overrides.quantidadeDisponivel ?? 20,
    quantidadeReservada: overrides.quantidadeReservada ?? 0,
    nivelMinimo: overrides.nivelMinimo ?? 5,
    nivelMaximo: overrides.nivelMaximo ?? 100,
  });
}

describe('ItemEstoque entity', () => {
  describe('create', () => {
    it('creates with given quantities and defaults', () => {
      const item = makeItem();
      expect(item.pecaId).toBe('peca-uuid-1');
      expect(item.quantidadeDisponivel).toBe(20);
      expect(item.quantidadeReservada).toBe(0);
      expect(item.nivelMinimo).toBe(5);
      expect(item.nivelMaximo).toBe(100);
      expect(item.id).toBeDefined();
      expect(item.criadoEm).toBeInstanceOf(Date);
    });

    it('defaults quantidadeReservada to 0 when omitted', () => {
      const item = ItemEstoque.create({
        pecaId: 'abc',
        quantidadeDisponivel: 10,
        nivelMinimo: 2,
        nivelMaximo: 50,
      });
      expect(item.quantidadeReservada).toBe(0);
    });

    it('throws for negative quantidadeDisponivel', () => {
      expect(() => makeItem({ quantidadeDisponivel: -1 })).toThrow('quantidadeDisponivel não pode ser negativa');
    });

    it('throws for negative quantidadeReservada', () => {
      expect(() => makeItem({ quantidadeReservada: -1 })).toThrow('quantidadeReservada não pode ser negativa');
    });

    it('throws for negative nivelMinimo', () => {
      expect(() => makeItem({ nivelMinimo: -1 })).toThrow('nivelMinimo não pode ser negativo');
    });

    it('throws when nivelMaximo <= nivelMinimo', () => {
      expect(() => makeItem({ nivelMinimo: 10, nivelMaximo: 10 })).toThrow('nivelMaximo deve ser maior que nivelMinimo');
    });
  });

  describe('totalEmEstoque', () => {
    it('is the sum of disponivel and reservada', () => {
      const item = makeItem({ quantidadeDisponivel: 15, quantidadeReservada: 3 });
      expect(item.totalEmEstoque).toBe(18);
    });
  });

  describe('isAbaixoDoMinimo', () => {
    it('returns true when total is below nivelMinimo', () => {
      const item = makeItem({ quantidadeDisponivel: 2, quantidadeReservada: 1, nivelMinimo: 5 });
      expect(item.isAbaixoDoMinimo).toBe(true);
    });

    it('returns false when total equals nivelMinimo', () => {
      const item = makeItem({ quantidadeDisponivel: 3, quantidadeReservada: 2, nivelMinimo: 5 });
      expect(item.isAbaixoDoMinimo).toBe(false);
    });

    it('returns false when total is above nivelMinimo', () => {
      const item = makeItem({ quantidadeDisponivel: 10, quantidadeReservada: 0, nivelMinimo: 5 });
      expect(item.isAbaixoDoMinimo).toBe(false);
    });
  });

  describe('reservar', () => {
    it('decrements disponivel and increments reservada', () => {
      const item = makeItem({ quantidadeDisponivel: 10, quantidadeReservada: 2 });
      const updated = item.reservar(3);
      expect(updated.quantidadeDisponivel).toBe(7);
      expect(updated.quantidadeReservada).toBe(5);
    });

    it('returns a new instance (immutability)', () => {
      const item = makeItem({ quantidadeDisponivel: 10 });
      const updated = item.reservar(3);
      expect(updated).not.toBe(item);
      expect(item.quantidadeDisponivel).toBe(10);
    });

    it('throws when reserving more than available', () => {
      const item = makeItem({ quantidadeDisponivel: 5 });
      expect(() => item.reservar(6)).toThrow('Estoque insuficiente');
    });

    it('throws for zero quantity', () => {
      const item = makeItem();
      expect(() => item.reservar(0)).toThrow('Quantidade deve ser maior que zero');
    });

    it('throws for negative quantity', () => {
      const item = makeItem();
      expect(() => item.reservar(-1)).toThrow('Quantidade deve ser maior que zero');
    });

    it('allows reserving the entire available stock', () => {
      const item = makeItem({ quantidadeDisponivel: 5 });
      const updated = item.reservar(5);
      expect(updated.quantidadeDisponivel).toBe(0);
      expect(updated.quantidadeReservada).toBe(5);
    });
  });

  describe('utilizar', () => {
    it('decrements reservada (stock leaves the system)', () => {
      const item = makeItem({ quantidadeDisponivel: 8, quantidadeReservada: 4 });
      const updated = item.utilizar(3);
      expect(updated.quantidadeReservada).toBe(1);
      expect(updated.quantidadeDisponivel).toBe(8);
    });

    it('returns a new instance (immutability)', () => {
      const item = makeItem({ quantidadeReservada: 4 });
      const updated = item.utilizar(2);
      expect(updated).not.toBe(item);
      expect(item.quantidadeReservada).toBe(4);
    });

    it('throws when utilizing more than reserved', () => {
      const item = makeItem({ quantidadeReservada: 2 });
      expect(() => item.utilizar(3)).toThrow('Quantidade a utilizar excede o reservado');
    });

    it('throws for zero quantity', () => {
      const item = makeItem({ quantidadeReservada: 5 });
      expect(() => item.utilizar(0)).toThrow('Quantidade deve ser maior que zero');
    });
  });

  describe('liberarReserva', () => {
    it('moves quantity from reservada back to disponivel', () => {
      const item = makeItem({ quantidadeDisponivel: 5, quantidadeReservada: 4 });
      const updated = item.liberarReserva(2);
      expect(updated.quantidadeReservada).toBe(2);
      expect(updated.quantidadeDisponivel).toBe(7);
    });

    it('throws when releasing more than reserved', () => {
      const item = makeItem({ quantidadeReservada: 3 });
      expect(() => item.liberarReserva(4)).toThrow('Quantidade a liberar excede o reservado');
    });

    it('throws for zero quantity', () => {
      const item = makeItem({ quantidadeReservada: 3 });
      expect(() => item.liberarReserva(0)).toThrow('Quantidade deve ser maior que zero');
    });
  });

  describe('abastecer', () => {
    it('increments disponivel', () => {
      const item = makeItem({ quantidadeDisponivel: 10 });
      const updated = item.abastecer(15);
      expect(updated.quantidadeDisponivel).toBe(25);
      expect(updated.quantidadeReservada).toBe(item.quantidadeReservada);
    });

    it('returns a new instance (immutability)', () => {
      const item = makeItem({ quantidadeDisponivel: 10 });
      const updated = item.abastecer(5);
      expect(updated).not.toBe(item);
      expect(item.quantidadeDisponivel).toBe(10);
    });

    it('throws for zero quantity', () => {
      const item = makeItem();
      expect(() => item.abastecer(0)).toThrow('Quantidade deve ser maior que zero');
    });

    it('throws for negative quantity', () => {
      const item = makeItem();
      expect(() => item.abastecer(-5)).toThrow('Quantidade deve ser maior que zero');
    });
  });
});
