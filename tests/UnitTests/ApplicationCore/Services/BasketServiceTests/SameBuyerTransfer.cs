using Microsoft.eShopWeb.ApplicationCore.Entities.BasketAggregate;
using Microsoft.eShopWeb.ApplicationCore.Interfaces;
using Microsoft.eShopWeb.ApplicationCore.Services;
using Microsoft.eShopWeb.ApplicationCore.Specifications;
using NSubstitute;
using Xunit;

namespace Microsoft.eShopWeb.UnitTests.ApplicationCore.Services.BasketServiceTests;

public class SameBuyerTransfer
{
    [Fact]
    public async Task LeavesBasketUnchangedWhenSourceAndDestinationAreTheSameBuyer()
    {
        // Arrange: both lookups would return the same persisted basket.
        var basket = new Basket("buyer@example.com");
        basket.AddItem(1, 10m, 2);
        var repository = Substitute.For<IRepository<Basket>>();
        repository.FirstOrDefaultAsync(Arg.Any<BasketWithItemsSpecification>(), Arg.Any<CancellationToken>())
            .Returns(basket);
        var service = new BasketService(repository, Substitute.For<IAppLogger<BasketService>>());

        // Act
        await service.TransferBasketAsync(basket.BuyerId, basket.BuyerId);

        // Assert: no quantity duplication and no destructive persistence call.
        Assert.Equal(2, Assert.Single(basket.Items).Quantity);
        await repository.DidNotReceive().UpdateAsync(Arg.Any<Basket>(), Arg.Any<CancellationToken>());
        await repository.DidNotReceive().DeleteAsync(Arg.Any<Basket>(), Arg.Any<CancellationToken>());
        await repository.DidNotReceive().AddAsync(Arg.Any<Basket>(), Arg.Any<CancellationToken>());
    }
}
