using Ardalis.Result;
using Microsoft.eShopWeb.ApplicationCore.Entities.BasketAggregate;
using Microsoft.eShopWeb.ApplicationCore.Interfaces;
using Microsoft.eShopWeb.ApplicationCore.Services;
using Microsoft.eShopWeb.ApplicationCore.Specifications;
using NSubstitute;
using Xunit;

namespace Microsoft.eShopWeb.UnitTests.ApplicationCore.Services.BasketServiceTests;

public class BasketRegression
{
    private readonly IRepository<Basket> _repository = Substitute.For<IRepository<Basket>>();
    private BasketService Service => new(_repository, Substitute.For<IAppLogger<BasketService>>());

    [Fact]
    public async Task CreatesMissingBasketAndPersistsRequestedItem()
    {
        // Arrange
        _repository.FirstOrDefaultAsync(Arg.Any<BasketWithItemsSpecification>(), Arg.Any<CancellationToken>())
            .Returns((Basket?)null);
        // Act
        var basket = await Service.AddItemToBasket("buyer", 7, 12m, 3);
        // Assert
        Assert.Equal("buyer", basket.BuyerId);
        var item = Assert.Single(basket.Items);
        Assert.Equal(7, item.CatalogItemId);
        Assert.Equal(12m, item.UnitPrice);
        Assert.Equal(3, item.Quantity);
        await _repository.Received(1).AddAsync(basket, Arg.Any<CancellationToken>());
        await _repository.Received(1).UpdateAsync(basket, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ReusesExistingBasketWithoutCreatingAnother()
    {
        // Arrange
        var existing = new Basket("buyer");
        existing.AddItem(7, 12m, 2);
        _repository.FirstOrDefaultAsync(Arg.Any<BasketWithItemsSpecification>(), Arg.Any<CancellationToken>()).Returns(existing);
        // Act
        var basket = await Service.AddItemToBasket("buyer", 7, 99m, 3);
        // Assert
        Assert.Same(existing, basket);
        Assert.Equal(5, Assert.Single(basket.Items).Quantity);
        Assert.Equal(12m, Assert.Single(basket.Items).UnitPrice);
        await _repository.DidNotReceive().AddAsync(Arg.Any<Basket>(), Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(0, 0)]
    [InlineData(4, 4)]
    public async Task UpdatesQuantityAndRemovesEmptyItems(int quantity, int total)
    {
        // Arrange
        var basket = new Basket("buyer");
        basket.AddItem(7, 12m, 2);
        var item = Assert.Single(basket.Items);
        _repository.FirstOrDefaultAsync(Arg.Any<BasketWithItemsSpecification>(), Arg.Any<CancellationToken>()).Returns(basket);
        // Act
        var result = await Service.SetQuantities(1, new() { [item.Id.ToString()] = quantity });
        // Assert
        Assert.Equal(ResultStatus.Ok, result.Status);
        Assert.Equal(total, result.Value.TotalItems);
        Assert.Equal(quantity == 0 ? 0 : 1, basket.Items.Count);
        await _repository.Received(1).UpdateAsync(basket, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ReturnsNotFoundWithoutUpdatingMissingBasket()
    {
        // Arrange
        _repository.FirstOrDefaultAsync(Arg.Any<BasketWithItemsSpecification>(), Arg.Any<CancellationToken>()).Returns((Basket?)null);
        // Act
        var result = await Service.SetQuantities(999, new());
        // Assert
        Assert.Equal(ResultStatus.NotFound, result.Status);
        await _repository.DidNotReceive().UpdateAsync(Arg.Any<Basket>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RejectsDeletingMissingBasketWithCorrectParameterName()
    {
        // Arrange
        _repository.GetByIdAsync(999, Arg.Any<CancellationToken>()).Returns((Basket?)null);
        // Act
        var error = await Assert.ThrowsAsync<ArgumentNullException>(() => Service.DeleteBasketAsync(999));
        // Assert
        Assert.Equal("basket", error.ParamName);
        await _repository.DidNotReceive().DeleteAsync(Arg.Any<Basket>(), Arg.Any<CancellationToken>());
    }
}
